-- =====================================================================
-- Smart Library — Migration 2: functions, triggers, quotas
-- =====================================================================

-- ---------- admin check ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- new user bootstrap: profile + default categories ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lang text;
  v_name text;
  v_cats text[];
begin
  v_lang := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'ar');
  if v_lang not in ('ar', 'fr') then
    v_lang := 'ar';
  end if;

  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.profiles (id, full_name, preferred_language)
  values (new.id, v_name, v_lang);

  if v_lang = 'ar' then
    v_cats := array['القانون', 'التاريخ', 'الأدب', 'العلوم', 'الاقتصاد',
                    'السياسة', 'التعليم', 'الدين', 'التكنولوجيا', 'أخرى'];
  else
    v_cats := array['Droit', 'Histoire', 'Littérature', 'Sciences', 'Économie',
                    'Politique', 'Éducation', 'Religion', 'Technologie', 'Autre'];
  end if;

  insert into public.categories (user_id, name)
  select new.id, c from unnest(v_cats) as c;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- books: ownership, real file size and quota enforcement ----------
-- The book row is created AFTER the file is uploaded. The trigger:
--   * verifies the file path lives in the caller's own folder,
--   * verifies the object really exists in Storage and takes its REAL size
--     (the client-supplied file_size is never trusted),
--   * enforces plan quotas (storage, book count) and a per-hour rate limit.
-- On rejection the client deletes the orphan upload (upload error recovery).
create or replace function public.enforce_book_insert()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_plan    public.plans%rowtype;
  v_size    bigint;
  v_used    bigint;
  v_count   integer;
  v_recent  integer;
  v_limit   integer;
  v_max     bigint;
begin
  if auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'FORBIDDEN_USER';
  end if;

  if split_part(new.file_path, '/', 1) <> new.user_id::text then
    raise exception 'FORBIDDEN_PATH';
  end if;

  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o
  where o.bucket_id = 'private-books' and o.name = new.file_path;

  if v_size is null then
    raise exception 'STORAGE_OBJECT_MISSING';
  end if;
  new.file_size := v_size;

  select (value #>> '{}')::bigint into v_max from public.app_config where key = 'max_upload_bytes';
  if v_max is not null and v_size > v_max then
    raise exception 'FILE_TOO_LARGE';
  end if;

  select pl.* into v_plan
  from public.plans pl
  join public.profiles pr on pr.plan_id = pl.id
  where pr.id = new.user_id;

  if not found then
    raise exception 'PROFILE_MISSING';
  end if;

  select count(*) into v_count from public.books where user_id = new.user_id;
  if v_count >= v_plan.max_books then
    raise exception 'QUOTA_BOOKS_EXCEEDED';
  end if;

  -- real usage: every object (originals + covers) in the user's folder
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0) into v_used
  from storage.objects o
  where o.bucket_id = 'private-books'
    and (storage.foldername(o.name))[1] = new.user_id::text;

  if v_used > v_plan.storage_quota_bytes then
    raise exception 'QUOTA_STORAGE_EXCEEDED';
  end if;

  select coalesce((select (value #>> '{}')::integer from public.app_config
                   where key = 'book_inserts_per_hour'), 200) into v_limit;
  select count(*) into v_recent from public.books
  where user_id = new.user_id and created_at > now() - interval '1 hour';
  if v_recent >= v_limit then
    raise exception 'RATE_LIMIT_EXCEEDED';
  end if;

  return new;
end;
$$;

create trigger books_enforce_insert
  before insert on public.books
  for each row execute function public.enforce_book_insert();

-- ---------- shelves quota ----------
create or replace function public.enforce_shelf_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max   integer;
  v_count integer;
begin
  if auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'FORBIDDEN_USER';
  end if;

  select pl.max_shelves into v_max
  from public.plans pl
  join public.profiles pr on pr.plan_id = pl.id
  where pr.id = new.user_id;

  if v_max is not null then
    select count(*) into v_count from public.shelves where user_id = new.user_id;
    if v_count >= v_max then
      raise exception 'QUOTA_SHELVES_EXCEEDED';
    end if;
  end if;

  return new;
end;
$$;

create trigger shelves_enforce_insert
  before insert on public.shelves
  for each row execute function public.enforce_shelf_insert();

-- ---------- dashboard statistics (computed in the database) ----------
create or replace function public.get_library_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  public.plans%rowtype;
  v_used  bigint;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select pl.* into v_plan
  from public.plans pl join public.profiles pr on pr.plan_id = pl.id
  where pr.id = v_uid;

  select coalesce(sum((o.metadata ->> 'size')::bigint), 0) into v_used
  from storage.objects o
  where o.bucket_id = 'private-books'
    and (storage.foldername(o.name))[1] = v_uid::text;

  select jsonb_build_object(
    'total_books',     count(*),
    'reading_books',   count(*) filter (where reading_status = 'reading'),
    'completed_books', count(*) filter (where reading_status = 'completed'),
    'favorite_books',  count(*) filter (where is_favorite)
  ) into v_result
  from public.books where user_id = v_uid;

  return v_result || jsonb_build_object(
    'total_shelves',  (select count(*) from public.shelves where user_id = v_uid),
    'storage_used',   v_used,
    'storage_quota',  v_plan.storage_quota_bytes,
    'max_books',      v_plan.max_books,
    'max_shelves',    v_plan.max_shelves,
    'plan_id',        v_plan.id,
    'plan_name',      v_plan.name
  );
end;
$$;

revoke all on function public.get_library_stats() from public, anon;
grant execute on function public.get_library_stats() to authenticated;

-- ---------- admin: aggregate statistics only (never book contents) ----------
create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return jsonb_build_object(
    'total_users',    (select count(*) from public.profiles),
    'active_users_30d',
      (select count(distinct user_id) from public.reading_progress
       where last_read_at > now() - interval '30 days'),
    'total_books',    (select count(*) from public.books),
    'books_last_7d',  (select count(*) from public.books where created_at > now() - interval '7 days'),
    'total_storage',  (select coalesce(sum((metadata ->> 'size')::bigint), 0)
                       from storage.objects where bucket_id = 'private-books'),
    'errors_last_24h',(select count(*) from public.error_logs
                       where created_at > now() - interval '24 hours')
  );
end;
$$;

revoke all on function public.admin_get_stats() from public, anon;
grant execute on function public.admin_get_stats() to authenticated;

-- ---------- admin: change a user's plan ----------
create or replace function public.admin_set_user_plan(p_user uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profiles set plan_id = p_plan where id = p_user;
end;
$$;

revoke all on function public.admin_set_user_plan(uuid, text) from public, anon;
grant execute on function public.admin_set_user_plan(uuid, text) to authenticated;

-- ---------- self-service account deletion ----------
-- The client first removes the user's Storage objects through the Storage API
-- (so the underlying files are really deleted), then calls this function.
-- All user-owned rows are removed through ON DELETE CASCADE.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
