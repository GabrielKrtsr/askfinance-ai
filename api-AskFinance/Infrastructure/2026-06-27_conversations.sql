-- Copilote IA : conversations + messages (historique réouvrable).
-- À exécuter dans le SQL editor de Supabase.
--
-- Modèle : l'API Python écrit (service_role, user_id posé depuis le token validé) ;
-- le front lit via supabase-js, filtré par le RLS. Même schéma que `transactions`.

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_conversations_user
  on public.conversations (user_id, updated_at desc);
create index if not exists idx_messages_conversation
  on public.messages (conversation_id, created_at);

-- RLS : chacun ne voit que ses propres conversations / messages.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_owner" on public.conversations;
create policy "conversations_owner" on public.conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "messages_owner" on public.messages;
create policy "messages_owner" on public.messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Remonte conversations.updated_at à chaque nouveau message (tri « activité récente »).
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();
