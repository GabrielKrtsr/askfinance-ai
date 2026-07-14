-- Suppression sécurisée des comptes bancaires.
-- Création/modification : contributeurs ; suppression destructive : admin/owner.

drop policy if exists accounts_members on accounts;
drop policy if exists accounts_write on accounts;
drop policy if exists accounts_read on accounts;
drop policy if exists accounts_insert on accounts;
drop policy if exists accounts_update on accounts;
drop policy if exists accounts_delete on accounts;

create policy accounts_insert on accounts
  for insert with check (can_edit_workspace(workspace_id));

create policy accounts_update on accounts
  for update using (can_edit_workspace(workspace_id))
  with check (can_edit_workspace(workspace_id));

create policy accounts_delete on accounts
  for delete using (can_admin_workspace(workspace_id));

create policy accounts_read on accounts
  for select using (is_workspace_member(workspace_id));
