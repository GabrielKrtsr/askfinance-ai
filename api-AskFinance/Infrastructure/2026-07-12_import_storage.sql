-- Bucket privé de transit pour les imports CSV traités directement par l'API.
-- Le fichier est supprimé par FastAPI à la fin du traitement, succès ou échec.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transaction-imports',
  'transaction-imports',
  false,
  10485760,
  array['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload their own transaction imports" on storage.objects;
create policy "Users upload their own transaction imports"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'transaction-imports'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users delete their own transaction imports" on storage.objects;
create policy "Users delete their own transaction imports"
on storage.objects for delete to authenticated
using (
  bucket_id = 'transaction-imports'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
