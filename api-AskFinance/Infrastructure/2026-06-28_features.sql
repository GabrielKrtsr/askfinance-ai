-- Nouvelles features (2026-06-28) :
--   1) tax_settings      → coffre-fort fiscal (taux de provision + périodicités)
--   2) einvoice_checklist → préparation à la facture électronique 2026/2027
-- À exécuter dans le SQL editor de Supabase.
--
-- Modèle : CRUD géré côté front via supabase-js (RLS), comme `budgets`/`accounts`.
-- L'API Python lit `tax_settings` en service_role (user_id posé depuis le token).

-- 1) Coffre-fort fiscal : réglages de provision et d'échéances de l'utilisateur.
-- Les taux sont des POURCENTAGES DU CHIFFRE D'AFFAIRES à provisionner. Tout est
-- indicatif et paramétré par l'utilisateur (à valider avec son expert-comptable).
create table if not exists public.tax_settings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  provision_tva_taux    numeric(5,2) not null default 0,   -- % du CA mis de côté pour la TVA
  provision_social_taux numeric(5,2) not null default 0,   -- % du CA pour les charges sociales (URSSAF)
  provision_is_taux     numeric(5,2) not null default 0,   -- % du CA pour l'impôt (IS/IR)
  tva_periodicite       text not null default 'mensuel'
                          check (tva_periodicite in ('mensuel','trimestriel','annuel','aucun')),
  urssaf_periodicite    text not null default 'trimestriel'
                          check (urssaf_periodicite in ('mensuel','trimestriel')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.tax_settings enable row level security;

drop policy if exists "tax_settings_owner" on public.tax_settings;
create policy "tax_settings_owner" on public.tax_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Checklist de préparation à la facture électronique (une ligne = un item coché).
create table if not exists public.einvoice_checklist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_key   text not null,
  done       boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, item_key)
);

alter table public.einvoice_checklist enable row level security;

drop policy if exists "einvoice_checklist_owner" on public.einvoice_checklist;
create policy "einvoice_checklist_owner" on public.einvoice_checklist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
