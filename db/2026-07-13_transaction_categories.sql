-- Catégorisation corrigible et règles apprenantes.

alter table transactions
  add column if not exists category_source text not null default 'import'
    check (category_source in ('import', 'rule', 'ai', 'manual')),
  add column if not exists category_confidence numeric
    check (category_confidence between 0 and 1);

create table if not exists transaction_category_rules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label_key    text not null,
  category     text not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, label_key)
);

create index if not exists idx_category_rules_workspace
  on transaction_category_rules (workspace_id);

alter table transaction_category_rules enable row level security;
drop policy if exists category_rules_read on transaction_category_rules;
drop policy if exists category_rules_write on transaction_category_rules;
create policy category_rules_read on transaction_category_rules
  for select using (is_workspace_member(workspace_id));
create policy category_rules_write on transaction_category_rules
  for all using (can_edit_workspace(workspace_id))
  with check (can_edit_workspace(workspace_id));

drop trigger if exists trg_category_rules_updated on transaction_category_rules;
create trigger trg_category_rules_updated
  before update on transaction_category_rules
  for each row execute function set_updated_at();
