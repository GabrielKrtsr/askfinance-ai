-- Recherche, filtres et tris efficaces pour la pagination serveur des transactions.
create extension if not exists pg_trgm;

create index if not exists transactions_workspace_date_id_idx
  on public.transactions (workspace_id, date desc, id desc);

create index if not exists transactions_workspace_amount_id_idx
  on public.transactions (workspace_id, amount, id);

create index if not exists transactions_workspace_label_id_idx
  on public.transactions (workspace_id, label, id);

create index if not exists transactions_workspace_category_date_idx
  on public.transactions (workspace_id, category, date desc, id desc);

create index if not exists transactions_workspace_direction_date_idx
  on public.transactions (workspace_id, direction, date desc, id desc);

create index if not exists transactions_label_trgm_idx
  on public.transactions using gin (label gin_trgm_ops);

-- Valeurs du sélecteur de catégories, sans ramener toutes les transactions.
create or replace function public.transaction_categories(p_workspace_id uuid)
returns table(category text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct t.category
  from public.transactions t
  where t.workspace_id = p_workspace_id
    and t.category is not null
    and t.category <> ''
  order by t.category;
$$;

-- Totaux de l'ensemble filtré ; ils ne dépendent pas des 50 lignes affichées.
create or replace function public.transaction_filter_summary(
  p_workspace_id uuid,
  p_search text default null,
  p_category text default null,
  p_direction text default null,
  p_from date default null,
  p_to date default null
)
returns table(total_in numeric, total_out numeric, net numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(t.amount) filter (where t.direction = 'credit'), 0) as total_in,
    coalesce(sum(t.amount) filter (where t.direction = 'debit'), 0) as total_out,
    coalesce(sum(t.amount), 0) as net
  from public.transactions t
  where t.workspace_id = p_workspace_id
    and (p_search is null or t.label ilike ('%' || p_search || '%'))
    and (p_category is null or t.category = p_category)
    and (p_direction is null or t.direction = p_direction)
    and (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to);
$$;

revoke all on function public.transaction_categories(uuid) from public;
grant execute on function public.transaction_categories(uuid) to authenticated;
revoke all on function public.transaction_filter_summary(uuid, text, text, text, date, date) from public;
grant execute on function public.transaction_filter_summary(uuid, text, text, text, date, date) to authenticated;
