-- Collaboration auditée + cycle facture -> paiement -> relance.

alter table expected_receivables
  add column if not exists invoice_number text,
  add column if not exists contact_email text,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists matched_transaction_id uuid references transactions(id) on delete set null,
  add column if not exists matched_at timestamptz,
  add column if not exists received_at date;

alter table expected_receivables drop constraint if exists expected_receivables_status_check;
alter table expected_receivables add constraint expected_receivables_status_check
  check (status in ('expected', 'partial', 'received', 'cancelled'));

create table if not exists receivable_reminders (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
  receivable_id uuid not null references expected_receivables(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'phone', 'other')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'cancelled')),
  content text, sent_at timestamptz, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists workflow_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null, title text not null, description text, entity_type text, entity_id uuid,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  assigned_to uuid references auth.users(id) on delete set null, created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null, action text not null,
  entity_type text not null, entity_id text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reminders_receivable on receivable_reminders (receivable_id, created_at desc);
create index if not exists idx_workflows_workspace on workflow_items (workspace_id, status, created_at desc);
create index if not exists idx_audit_workspace on audit_events (workspace_id, created_at desc);

alter table receivable_reminders enable row level security;
alter table workflow_items enable row level security;
alter table audit_events enable row level security;
drop policy if exists reminders_read on receivable_reminders;
drop policy if exists reminders_write on receivable_reminders;
drop policy if exists workflows_read on workflow_items;
drop policy if exists workflows_write on workflow_items;
drop policy if exists audit_read on audit_events;
drop policy if exists audit_insert on audit_events;
create policy reminders_read on receivable_reminders for select using (is_workspace_member(workspace_id));
create policy workflows_read on workflow_items for select using (is_workspace_member(workspace_id));
create policy audit_read on audit_events for select using (is_workspace_member(workspace_id));

drop trigger if exists trg_workflow_items_updated on workflow_items;
create trigger trg_workflow_items_updated before update on workflow_items
  for each row execute function set_updated_at();
