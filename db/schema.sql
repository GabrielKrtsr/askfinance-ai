-- =============================================================================
-- AskFinance — schéma de base (greenfield, multi-workspace)
-- Identifiants en anglais, commentaires en français.
-- Termes réglementaires français conservés comme noms propres : urssaf, siret.
-- À exécuter dans l'éditeur SQL Supabase. Détruit et recrée tout.
-- =============================================================================

create extension if not exists pgcrypto;  -- pour gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Teardown : on casse tout (rien en prod).
-- -----------------------------------------------------------------------------
drop table if exists shared_expense_shares cascade;
drop table if exists shared_expenses       cascade;
drop table if exists settlements           cascade;
drop table if exists messages              cascade;
drop table if exists conversations         cascade;
drop table if exists einvoice_checklist    cascade;
drop table if exists tax_settings          cascade;
drop table if exists expected_receivables  cascade;
drop table if exists budgets               cascade;
drop table if exists transactions          cascade;
drop table if exists imports               cascade;
drop table if exists accounts              cascade;
drop table if exists companies             cascade;
drop table if exists workspace_members     cascade;
drop table if exists workspaces            cascade;
drop table if exists profiles              cascade;
drop trigger   if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user()           cascade;
drop function if exists is_workspace_member(uuid)  cascade;
drop function if exists set_updated_at()            cascade;

-- -----------------------------------------------------------------------------
-- Utilitaire : met à jour automatiquement updated_at.
-- -----------------------------------------------------------------------------
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- IDENTITÉ & ESPACES
-- =============================================================================

-- profiles : prolonge auth.users avec les infos applicatives.
create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  first_name           text,
  last_name            text,
  avatar_url           text,
  default_workspace_id uuid,                 -- dernier espace ouvert (FK ajoutée plus bas)
  locale               text not null default 'fr',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- workspaces : l'espace financier. Le `type` EST le mode (perso / pro).
create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('personal', 'business', 'group')),
  name       text not null,
  join_code  text unique,                       -- code de jonction (rejoindre par code), généré côté serveur
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- workspace_members : qui a accès à quel espace, et avec quel rôle.
-- Source de vérité unique pour l'accès (pas de owner_id dénormalisé sur workspaces).
-- status : 'active' pour le créateur (owner) ; 'pending' pour une arrivée par code,
--          tant qu'un owner/admin n'a pas validé (aucun droit en 'pending').
create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member'
                 check (role in ('owner', 'admin', 'member', 'viewer')),
  status       text not null default 'active'
                 check (status in ('pending', 'active')),
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- FK différée : profiles.default_workspace_id -> workspaces.id
alter table profiles
  add constraint profiles_default_workspace_fk
  foreign key (default_workspace_id) references workspaces(id) on delete set null;

-- À chaque inscription Supabase, on crée automatiquement le profil correspondant
-- (first_name / last_name viennent des métadonnées du signup ; vides pour Google).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- companies : infos légales, UNIQUEMENT pour les espaces de type 'business'.
create table companies (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  legal_name   text,
  siret        text,                          -- nom propre FR conservé
  vat_number   text,
  legal_form   text,
  tax_regime   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =============================================================================
-- DONNÉES FINANCIÈRES (toutes scopées par workspace_id)
-- =============================================================================

-- accounts : comptes bancaires d'un espace.
create table accounts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  name            text not null,
  type            text not null default 'checking'
                    check (type in ('checking', 'savings', 'card', 'cash', 'other')),
  opening_balance numeric not null default 0,
  created_at      timestamptz not null default now()
);

-- imports : un lot d'import CSV (la suppression d'un lot supprime ses transactions).
create table imports (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  account_id   uuid references accounts(id) on delete cascade,
  filename     text,
  count        integer not null default 0,
  created_at   timestamptz not null default now()
);

-- transactions : le cœur. `label` (ex-merchant), `direction` (ex-type).
create table transactions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  account_id   uuid references accounts(id) on delete cascade,
  import_id    uuid references imports(id) on delete cascade,
  date         date not null,
  label        text not null,
  category     text,
  amount       numeric not null,
  direction    text not null check (direction in ('debit', 'credit')),
  status       text not null default 'cleared'
                 check (status in ('pending', 'cleared')),
  is_transfer  boolean not null default false,
  fingerprint  text,                          -- empreinte anti-doublon à l'import
  created_at   timestamptz not null default now(),
  -- dédoublonnage scopé à l'espace (était user_id,account_id,fingerprint)
  unique (workspace_id, account_id, fingerprint)
);

-- budgets : enveloppe mensuelle par catégorie.
create table budgets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category     text not null,
  amount       numeric not null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, category)
);

-- expected_receivables : encaissements clients attendus (espaces 'business').
create table expected_receivables (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client       text not null,
  amount       numeric not null,
  due_date     date,
  status       text not null default 'expected'
                 check (status in ('expected', 'received')),
  created_at   timestamptz not null default now()
);

-- tax_settings : coffre-fort fiscal (espaces 'business'). 1 ligne par espace.
create table tax_settings (
  id                          uuid primary key default gen_random_uuid(),
  workspace_id                uuid not null unique references workspaces(id) on delete cascade,
  vat_provision_rate          numeric,         -- ex provision_tva_taux
  social_provision_rate       numeric,         -- ex provision_social_taux
  corporate_tax_provision_rate numeric,        -- ex provision_is_taux (IS)
  vat_periodicity             text,            -- ex tva_periodicite
  urssaf_periodicity          text,            -- ex urssaf_periodicite (nom propre conservé)
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- einvoice_checklist : préparation facturation électronique (espaces 'business').
create table einvoice_checklist (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  item_key     text not null,
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (workspace_id, item_key)
);

-- =============================================================================
-- COPILOTE IA (conversations désormais rattachées à un espace)
-- =============================================================================

create table conversations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- TRIGGERS updated_at
-- =============================================================================
create trigger trg_profiles_updated      before update on profiles      for each row execute function set_updated_at();
create trigger trg_workspaces_updated     before update on workspaces     for each row execute function set_updated_at();
create trigger trg_companies_updated      before update on companies      for each row execute function set_updated_at();
create trigger trg_tax_settings_updated   before update on tax_settings   for each row execute function set_updated_at();
create trigger trg_conversations_updated  before update on conversations  for each row execute function set_updated_at();

-- =============================================================================
-- INDEX (clés étrangères les plus sollicitées en lecture)
-- =============================================================================
create index idx_members_user            on workspace_members (user_id);
create index idx_members_workspace        on workspace_members (workspace_id);
create index idx_accounts_workspace       on accounts (workspace_id);
create index idx_transactions_workspace   on transactions (workspace_id, date desc);
create index idx_transactions_account     on transactions (account_id);
create index idx_budgets_workspace        on budgets (workspace_id);
create index idx_receivables_workspace    on expected_receivables (workspace_id);
create index idx_imports_workspace        on imports (workspace_id);
create index idx_conversations_workspace  on conversations (workspace_id);
create index idx_messages_conversation    on messages (conversation_id);

-- =============================================================================
-- SÉCURITÉ — RLS (chemin Next.js, clé anon)
-- ⚠️ Le backend Python utilise la SERVICE_ROLE_KEY : il CONTOURNE la RLS.
--    La garde d'appartenance y est donc faite à la main (voir code Python).
-- =============================================================================

-- Helper SECURITY DEFINER : évite la récursion RLS sur workspace_members.
create function is_workspace_member(ws uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.status = 'active'          -- une adhésion 'pending' ne donne AUCUN droit
  );
$$;

alter table profiles             enable row level security;
alter table workspaces           enable row level security;
alter table workspace_members    enable row level security;
alter table companies            enable row level security;
alter table accounts             enable row level security;
alter table imports              enable row level security;
alter table transactions         enable row level security;
alter table budgets              enable row level security;
alter table expected_receivables enable row level security;
alter table tax_settings         enable row level security;
alter table einvoice_checklist   enable row level security;
alter table conversations        enable row level security;
alter table messages             enable row level security;

-- profiles : chacun ne voit/édite que son profil.
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- workspaces : visibles si on en est membre.
create policy workspaces_member_read on workspaces
  for select using (is_workspace_member(id));

-- workspace_members : on voit les membres des espaces dont on fait partie,
-- ET sa propre adhésion (même 'pending', pour l'écran « en attente de validation »).
-- (Les écritures — rejoindre / valider — passent par un chemin serveur de confiance.)
create policy members_read on workspace_members
  for select using (
    user_id = auth.uid()
    or is_workspace_member(workspace_id)
  );

-- Tables métier : lecture/écriture réservées aux membres de l'espace.
create policy companies_members  on companies            for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy accounts_members   on accounts             for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy imports_members    on imports              for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy tx_members         on transactions         for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy budgets_members    on budgets              for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy receiv_members     on expected_receivables for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy tax_members        on tax_settings         for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy einv_members       on einvoice_checklist   for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- conversations : PRIVÉES à leur auteur (même au sein d'un espace partagé).
-- Il faut être membre actif de l'espace ET propriétaire de la conversation.
create policy conv_owner on conversations
  for all
  using (user_id = auth.uid() and is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and is_workspace_member(workspace_id));

-- messages : accessibles uniquement via une conversation dont on est l'auteur.
create policy messages_owner on messages
  for all
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
      and is_workspace_member(c.workspace_id)
  ))
  with check (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
      and is_workspace_member(c.workspace_id)
  ));

-- =============================================================================
-- DÉPENSES PARTAGÉES (espaces de type 'group' — registre type Tricount)
-- =============================================================================

create table shared_expenses (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  paid_by               uuid not null references auth.users(id) on delete cascade,
  date                  date not null,
  label                 text not null,
  amount                numeric not null check (amount > 0),
  category              text,
  source_transaction_id uuid references transactions(id) on delete set null,  -- si poussée depuis un perso
  created_at            timestamptz not null default now()
);

create table shared_expense_shares (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references shared_expenses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  share_amount numeric not null,
  unique (expense_id, user_id)
);

create table settlements (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  from_user    uuid not null references auth.users(id) on delete cascade,
  to_user      uuid not null references auth.users(id) on delete cascade,
  amount       numeric not null check (amount > 0),
  status       text not null default 'paid'
                 check (status in ('paid', 'confirmed', 'disputed')),
  date         date not null default current_date,
  created_at   timestamptz not null default now()
);

create index idx_shared_expenses_workspace on shared_expenses (workspace_id, date desc);
create index idx_shares_expense            on shared_expense_shares (expense_id);
create index idx_settlements_workspace     on settlements (workspace_id);

alter table shared_expenses       enable row level security;
alter table shared_expense_shares enable row level security;
alter table settlements           enable row level security;

create policy shared_exp_members on shared_expenses
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy settlements_members on settlements
  for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

create policy shares_members on shared_expense_shares
  for all
  using (exists (select 1 from shared_expenses e
                 where e.id = shared_expense_shares.expense_id
                   and is_workspace_member(e.workspace_id)))
  with check (exists (select 1 from shared_expenses e
                      where e.id = shared_expense_shares.expense_id
                        and is_workspace_member(e.workspace_id)));
