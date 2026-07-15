-- Mémoire structurée des confirmations du copilote.
-- Le texte de la conversation reste destiné à l'affichage ; il ne pilote plus
-- implicitement le choix d'une période ou d'un outil.

alter table public.conversations
  add column if not exists pending_action jsonb;

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();
