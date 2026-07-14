-- Etat d'onboarding porte par l'espace, afin que tous ses membres partagent
-- la meme source de verite. Les espaces existants sont consideres configures.

alter table public.workspaces
  add column if not exists onboarding_status text;

update public.workspaces
set onboarding_status = 'completed'
where onboarding_status is null;

alter table public.workspaces
  alter column onboarding_status set default 'pending',
  alter column onboarding_status set not null;

alter table public.workspaces
  drop constraint if exists workspaces_onboarding_status_check;

alter table public.workspaces
  add constraint workspaces_onboarding_status_check
  check (onboarding_status in ('pending', 'completed', 'skipped'));
o