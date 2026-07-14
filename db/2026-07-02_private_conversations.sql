-- =============================================================================
-- Migration 2026-07-02 : conversations IA privées
-- Avant : tout membre actif d'un espace pouvait lire les conversations (et
-- messages) des autres membres. Après : chacun ne voit que les siennes.
-- À exécuter dans l'éditeur SQL Supabase.
-- =============================================================================

drop policy if exists conv_members     on conversations;
drop policy if exists messages_members on messages;

-- conversations : PRIVÉES à leur auteur (même au sein d'un espace partagé).
create policy conv_owner on conversations
  for all
  using (user_id = auth.uid() and is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and is_workspace_member(workspace_id));

-- messages : accessibles uniquement via une conversation dont on est l'auteur.
create policy messages_owner on messages
  for all
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
      and is_workspace_member(c.workspace_id)
  ))
  with check (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
      and is_workspace_member(c.workspace_id)
  ));
