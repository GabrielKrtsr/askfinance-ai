-- Matrice de permissions des espaces existants.
-- viewer = lecture seule ; member/admin/owner = contribution métier.

create or replace function can_edit_workspace(ws uuid)
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

create or replace function can_admin_workspace(ws uuid)
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

do $$
declare
  item record;
begin
  for item in select * from (values
    ('companies', 'companies_members'),
    ('accounts', 'accounts_members'),
    ('imports', 'imports_members'),
    ('transactions', 'tx_members'),
    ('budgets', 'budgets_members'),
    ('expected_receivables', 'receiv_members'),
    ('tax_settings', 'tax_members'),
    ('einvoice_checklist', 'einv_members'),
    ('shared_expenses', 'shared_exp_members'),
    ('settlements', 'settlements_members')
  ) as policies(table_name, policy_name)
  loop
    execute format('drop policy if exists %I on %I', item.policy_name, item.table_name);
  end loop;
end $$;

create policy companies_read  on companies            for select using (is_workspace_member(workspace_id));
create policy companies_write on companies            for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy accounts_read   on accounts             for select using (is_workspace_member(workspace_id));
create policy accounts_insert on accounts             for insert with check (can_edit_workspace(workspace_id));
create policy accounts_update on accounts             for update using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy accounts_delete on accounts             for delete using (can_admin_workspace(workspace_id));
create policy imports_read    on imports              for select using (is_workspace_member(workspace_id));
create policy imports_write   on imports              for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy tx_read         on transactions         for select using (is_workspace_member(workspace_id));
create policy tx_write        on transactions         for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy budgets_read    on budgets              for select using (is_workspace_member(workspace_id));
create policy budgets_write   on budgets              for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy receiv_read     on expected_receivables for select using (is_workspace_member(workspace_id));
create policy receiv_write    on expected_receivables for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy tax_read        on tax_settings         for select using (is_workspace_member(workspace_id));
create policy tax_write       on tax_settings         for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy einv_read       on einvoice_checklist   for select using (is_workspace_member(workspace_id));
create policy einv_write      on einvoice_checklist   for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy shared_exp_read on shared_expenses      for select using (is_workspace_member(workspace_id));
create policy shared_exp_write on shared_expenses     for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));
create policy settlements_read on settlements         for select using (is_workspace_member(workspace_id));
create policy settlements_write on settlements        for all using (can_edit_workspace(workspace_id)) with check (can_edit_workspace(workspace_id));

drop policy if exists shares_members on shared_expense_shares;
create policy shares_read on shared_expense_shares
  for select using (exists (
    select 1 from shared_expenses e
    where e.id = shared_expense_shares.expense_id
      and is_workspace_member(e.workspace_id)
  ));
create policy shares_write on shared_expense_shares
  for all
  using (exists (
    select 1 from shared_expenses e
    where e.id = shared_expense_shares.expense_id
      and can_edit_workspace(e.workspace_id)
  ))
  with check (exists (
    select 1 from shared_expenses e
    where e.id = shared_expense_shares.expense_id
      and can_edit_workspace(e.workspace_id)
  ));
