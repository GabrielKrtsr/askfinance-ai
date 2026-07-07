-- Échéancier des encaissements clients (déclaratif) — 2026-06-29.
-- L'utilisateur déclare les virements qu'il attend ; on les rapproche ensuite des
-- crédits réels (côté API Python). CRUD géré côté front via supabase-js (RLS),
-- comme `budgets`. À exécuter dans le SQL editor de Supabase.

create table if not exists public.expected_receivables (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  client     text not null,
  amount     numeric(12,2) not null,   -- montant attendu (jamais float)
  due_date   date not null,            -- date de paiement prévue
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_expected_receivables_user
  on public.expected_receivables (user_id, due_date);

alter table public.expected_receivables enable row level security;

drop policy if exists "expected_receivables_owner" on public.expected_receivables;
create policy "expected_receivables_owner" on public.expected_receivables
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
