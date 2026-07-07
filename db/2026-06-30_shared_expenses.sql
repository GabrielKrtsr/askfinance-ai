-- =============================================================================
-- Dépenses partagées des groupes (registre type Tricount) + règlements.
-- À exécuter UNE FOIS sur la base existante (n'efface aucune donnée).
-- =============================================================================

-- Dépenses partagées d'un groupe (curé : on n'y met que ce qui est commun).
create table if not exists shared_expenses (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  paid_by               uuid not null references auth.users(id) on delete cascade,
  date                  date not null,
  label                 text not null,
  amount                numeric not null check (amount > 0),
  category              text,
  source_transaction_id uuid references transactions(id) on delete set null,
  created_at            timestamptz not null default now()
);

-- Part due par chaque participant (répartition égale ou personnalisée).
create table if not exists shared_expense_shares (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references shared_expenses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  share_amount numeric not null,
  unique (expense_id, user_id)
);

-- Remboursements entre membres (« Régler »).
create table if not exists settlements (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  from_user    uuid not null references auth.users(id) on delete cascade,
  to_user      uuid not null references auth.users(id) on delete cascade,
  amount       numeric not null check (amount > 0),
  status       text not null default 'paid' check (status in ('paid', 'confirmed', 'disputed')),
  date         date not null default current_date,
  created_at   timestamptz not null default now()
);

create index if not exists idx_shared_expenses_workspace on shared_expenses (workspace_id, date desc);
create index if not exists idx_shares_expense on shared_expense_shares (expense_id);
create index if not exists idx_settlements_workspace on settlements (workspace_id);

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
