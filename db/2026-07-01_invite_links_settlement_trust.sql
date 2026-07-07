-- =============================================================================
-- Invitations par lien + historique de confiance des remboursements.
-- À exécuter UNE FOIS sur une base existante.
-- =============================================================================

alter table settlements
  add column if not exists status text not null default 'paid';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'settlements_status_check'
  ) then
    alter table settlements
      add constraint settlements_status_check
      check (status in ('paid', 'confirmed', 'disputed'));
  end if;
end $$;
