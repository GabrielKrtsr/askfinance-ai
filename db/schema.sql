-- =============================================================================
-- AskFinance, schéma de base (greenfield, multi-workspace)
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
drop table if exists receivable_reminders  cascade;
drop table if exists workflow_items        cascade;
drop table if exists audit_events          cascade;
drop table if exists financial_alert_states cascade;
drop table if exists transaction_category_rules cascade;
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
drop function if exists can_edit_workspace(uuid)   cascade;
drop function if exists can_admin_workspace(uuid)  cascade;
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
  category_source text not null default 'import'
                 check (category_source in ('import', 'rule', 'ai', 'manual')),
  category_confidence numeric check (category_confidence between 0 and 1),
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
  month        date not null check (month = date_trunc('month', month)::date),
  amount       numeric not null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, category, month)
);

-- Règles apprises lors des corrections : un libellé normalisé retrouve
-- automatiquement sa catégorie aux prochains imports.
create table transaction_category_rules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label_key    text not null,
  category     text not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, label_key)
);

-- État utilisateur des alertes calculées (les alertes elles-mêmes restent dérivées
-- des données fraîches ; seule leur résolution ou leur report est persisté).
create table financial_alert_states (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  alert_key     text not null,
  status        text not null default 'open'
                  check (status in ('open', 'snoozed', 'resolved')),
  snoozed_until date,
  updated_by    uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (workspace_id, alert_key)
);

-- expected_receivables : encaissements clients attendus (espaces 'business').
create table expected_receivables (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client       text not null,
  invoice_number text,
  contact_email text,
  amount       numeric not null,
  paid_amount  numeric not null default 0,
  due_date     date,
  status       text not null default 'expected'
                 check (status in ('expected', 'partial', 'received', 'cancelled')),
  matched_transaction_id uuid references transactions(id) on delete set null,
  matched_at   timestamptz,
  received_at  date,
  created_at   timestamptz not null default now()
);

create table receivable_reminders (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  receivable_id uuid not null references expected_receivables(id) on delete cascade,
  channel       text not null default 'email' check (channel in ('email', 'phone', 'other')),
  status        text not null default 'draft' check (status in ('draft', 'sent', 'cancelled')),
  content       text,
  sent_at       timestamptz,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table workflow_items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind         text not null,
  title        text not null,
  description  text,
  entity_type  text,
  entity_id    uuid,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  assigned_to  uuid references auth.users(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table audit_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id     uuid references auth.users(id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  metadata     jsonb not null default '{}'::jsonb,
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
create trigger trg_category_rules_updated before update on transaction_category_rules for each row execute function set_updated_at();
create trigger trg_alert_states_updated before update on financial_alert_states for each row execute function set_updated_at();
create trigger trg_workflow_items_updated before update on workflow_items for each row execute function set_updated_at();

-- =============================================================================
-- INDEX (clés étrangères les plus sollicitées en lecture)
-- =============================================================================
create index idx_members_user            on workspace_members (user_id);
create index idx_members_workspace        on workspace_members (workspace_id);
create index idx_accounts_workspace       on accounts (workspace_id);
create index idx_transactions_workspace   on transactions (workspace_id, date desc);
create index idx_transactions_account     on transactions (account_id);
create index idx_budgets_workspace        on budgets (workspace_id, month);
create index idx_category_rules_workspace on transaction_category_rules (workspace_id);
create index idx_alert_states_workspace    on financial_alert_states (workspace_id);
create index idx_receivables_workspace    on expected_receivables (workspace_id);
create index idx_reminders_receivable     on receivable_reminders (receivable_id, created_at desc);
create index idx_workflows_workspace      on workflow_items (workspace_id, status, created_at desc);
create index idx_audit_workspace          on audit_events (workspace_id, created_at desc);
create index idx_imports_workspace        on imports (workspace_id);
create index idx_conversations_workspace  on conversations (workspace_id);
create index idx_messages_conversation    on messages (conversation_id);

-- =============================================================================
-- SÉCURITÉ : RLS (chemin Next.js, clé anon)
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

-- Les rôles ne sont pas décoratifs : viewer lit, member contribue,
-- admin/owner administrent. Ces helpers centralisent la matrice RLS.
create function can_edit_workspace(ws uuid)
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
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'member')
  );
$$;

create function can_admin_workspace(ws uuid)
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
      and m.status = 'active'
      and m.role in ('owner', 'admin')
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
alter table transaction_category_rules enable row level security;
alter table financial_alert_states enable row level security;
alter table receivable_reminders enable row level security;
alter table workflow_items enable row level security;
alter table audit_events enable row level security;
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
-- (Les écritures pour rejoindre ou valider passent par un chemin serveur de confiance.)
create policy members_read on workspace_members
  for select using (
    user_id = auth.uid()
    or is_workspace_member(workspace_id)
  );

-- Tables métier : tous les membres actifs lisent ; un viewer ne modifie rien.
create policy companies_read   on companies            for select using (is_workspace_member(workspace_id));
create policy companies_write  on companies            for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy accounts_read    on accounts             for select using (is_workspace_member(workspace_id));
create policy accounts_insert  on accounts             for insert with check (can_edit_workspace(workspace_id));
create policy accounts_update  on accounts             for update using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy accounts_delete  on accounts             for delete using (can_admin_workspace(workspace_id));
create policy imports_read     on imports              for select using (is_workspace_member(workspace_id));
create policy imports_write    on imports              for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy tx_read          on transactions         for select using (is_workspace_member(workspace_id));
create policy tx_write         on transactions         for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy budgets_read     on budgets              for select using (is_workspace_member(workspace_id));
create policy budgets_write    on budgets              for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy category_rules_read on transaction_category_rules for select using (is_workspace_member(workspace_id));
create policy category_rules_write on transaction_category_rules for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy alert_states_read on financial_alert_states for select using (is_workspace_member(workspace_id));
create policy alert_states_write on financial_alert_states for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy reminders_read on receivable_reminders for select using (is_workspace_member(workspace_id));
create policy workflows_read on workflow_items for select using (is_workspace_member(workspace_id));
create policy audit_read on audit_events for select using (is_workspace_member(workspace_id));
-- Écritures reminders/workflows/audit : uniquement via les actions serveur
-- (service role + validation explicite du rôle et journalisation).
create policy receiv_read      on expected_receivables for select using (is_workspace_member(workspace_id));
create policy receiv_write     on expected_receivables for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy tax_read         on tax_settings         for select using (is_workspace_member(workspace_id));
create policy tax_write        on tax_settings         for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy einv_read        on einvoice_checklist   for select using (is_workspace_member(workspace_id));
create policy einv_write       on einvoice_checklist   for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));

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
-- DÉPENSES PARTAGÉES (espaces de type 'group', registre type Tricount)
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

create policy shared_exp_read on shared_expenses
  for select using (is_workspace_member(workspace_id));
create policy shared_exp_write on shared_expenses
  for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));

create policy settlements_read on settlements
  for select using (is_workspace_member(workspace_id));
create policy settlements_write on settlements
  for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));

create policy shares_members on shared_expense_shares
  for all
  using (exists (select 1 from shared_expenses e
                 where e.id = shared_expense_shares.expense_id
                   and is_workspace_member(e.workspace_id)))
  with check (exists (select 1 from shared_expenses e
                      where e.id = shared_expense_shares.expense_id
                        and can_edit_workspace(e.workspace_id)));
