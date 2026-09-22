-- Stories media. Bucket privado: a leitura segue a visibilidade de public.stories.
-- Sem follows, sem media de posts, sem notificações.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'stories',
  'stories',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]::text[]
);

create policy stories_objects_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'stories'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm')
);

create policy stories_objects_select_visible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'stories'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or exists (
      select 1
      from public.stories as story
      where story.media_url = name
        and story.user_id::text = (storage.foldername(name))[1]
        and story.expires_at > pg_catalog.now()
    )
  )
);

create policy stories_objects_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
