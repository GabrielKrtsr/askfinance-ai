-- Persistance légère des décisions prises dans l'Inbox financière.

create table if not exists financial_alert_states (
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

create index if not exists idx_alert_states_workspace
  on financial_alert_states (workspace_id);
alter table financial_alert_states enable row level security;
drop policy if exists alert_states_read on financial_alert_states;
drop policy if exists alert_states_write on financial_alert_states;
create policy alert_states_read on financial_alert_states
  for select using (is_workspace_member(workspace_id));
create policy alert_states_write on financial_alert_states
  for all using (can_edit_workspace(workspace_id))
  with check (can_edit_workspace(workspace_id));

drop trigger if exists trg_alert_states_updated on financial_alert_states;
create trigger trg_alert_states_updated
  before update on financial_alert_states
  for each row execute function set_updated_at();
