-- =====================================================================
-- Smart Library — Migration 3: Row Level Security and Storage policies
-- Every user-owned table is locked to auth.uid(). Administrators get NO
-- policy on books, notes, bookmarks, progress or storage objects, so they
-- cannot read private book contents.
-- =====================================================================

-- ---------- enable RLS everywhere ----------
alter table public.plans             enable row level security;
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.books             enable row level security;
alter table public.shelves           enable row level security;
alter table public.book_shelves      enable row level security;
alter table public.reading_progress  enable row level security;
alter table public.bookmarks         enable row level security;
alter table public.notes             enable row level security;
alter table public.offline_downloads enable row level security;
alter table public.app_config        enable row level security;
alter table public.error_logs        enable row level security;

-- ---------- privileges: column-level grants stop privilege escalation ----------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.plans, public.app_config to authenticated;
grant select on public.profiles to authenticated;
-- users may edit ONLY these profile columns (never plan_id / is_admin)
grant update (full_name, avatar_url, preferred_language, ui_theme, reader_theme, reading_direction)
  on public.profiles to authenticated;

grant select, insert, delete on public.categories to authenticated;
grant update (name) on public.categories to authenticated;
grant insert (user_id, name) on public.categories to authenticated;

grant select, delete on public.books to authenticated;
grant insert (user_id, title, author, description, language, publication_date, cover_path,
              file_path, file_format, file_size, file_hash, total_pages, category_id)
  on public.books to authenticated;
-- file_path / file_size / user_id can never be changed after creation
grant update (title, author, description, language, publication_date, cover_path, total_pages,
              category_id, reading_status, is_favorite, last_opened_at)
  on public.books to authenticated;

grant select, delete on public.shelves to authenticated;
grant insert (user_id, name, description, cover_color) on public.shelves to authenticated;
grant update (name, description, cover_color) on public.shelves to authenticated;

grant select, insert, delete on public.book_shelves to authenticated;

grant select, insert, update, delete on public.reading_progress to authenticated;
grant select, insert, update, delete on public.bookmarks to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.offline_downloads to authenticated;

grant insert (user_id, source, message, context) on public.error_logs to authenticated;
grant select on public.error_logs to authenticated; -- gated to admins by RLS below
grant update, insert on public.plans to authenticated; -- gated to admins by RLS below
grant insert, update on public.app_config to authenticated; -- gated to admins by RLS below

-- ---------- plans / config ----------
create policy plans_read on public.plans
  for select to authenticated using (true);
create policy plans_admin_update on public.plans
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy config_read on public.app_config
  for select to authenticated using (true);
create policy config_admin_write on public.app_config
  for insert to authenticated with check (public.is_admin());
create policy config_admin_update on public.app_config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles ----------
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- no INSERT policy: rows are created only by the handle_new_user trigger
-- no DELETE policy: removed only through delete_my_account()

-- ---------- owner-only policies for user-owned tables ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'books', 'shelves', 'book_shelves',
    'reading_progress', 'bookmarks', 'notes', 'offline_downloads'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end
$$;

-- ---------- error log ----------
create policy error_logs_insert_own on public.error_logs
  for insert to authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy error_logs_admin_read on public.error_logs
  for select to authenticated using (public.is_admin());

-- =====================================================================
-- Storage
-- =====================================================================

-- Private bucket for books and covers: NEVER public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-books', 'private-books', false, 104857600,
  array['application/pdf', 'application/epub+zip', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Avatars are small profile images, kept in their own public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- private-books: path layout  {user_id}/books/{book_id}/original.(pdf|epub) | cover.jpg
create policy "private-books: owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-books' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "private-books: owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'private-books' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "private-books: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'private-books' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'private-books' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "private-books: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'private-books' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- avatars: path layout  {user_id}/avatar.(jpg|png|webp)
create policy "avatars: owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
