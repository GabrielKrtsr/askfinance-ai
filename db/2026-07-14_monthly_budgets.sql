-- Budgets variables par mois.
-- Les budgets existants sont rattachés au mois de leur transaction la plus
-- récente dans l'espace (ou au mois courant si l'espace est encore vide).

alter table budgets
  add column if not exists month date;

update budgets b
set month = coalesce(
  (
    select date_trunc('month', max(t.date))::date
    from transactions t
    where t.workspace_id = b.workspace_id
  ),
  date_trunc('month', current_date)::date
)
where b.month is null;

alter table budgets
  alter column month set not null;

alter table budgets
  drop constraint if exists budgets_workspace_id_category_key;

alter table budgets
  drop constraint if exists budgets_workspace_id_category_month_key;

alter table budgets
  add constraint budgets_workspace_id_category_month_key
  unique (workspace_id, category, month);

alter table budgets
  drop constraint if exists budgets_month_first_day;

alter table budgets
  add constraint budgets_month_first_day
  check (month = date_trunc('month', month)::date);

drop index if exists idx_budgets_workspace;
create index idx_budgets_workspace on budgets (workspace_id, month);
