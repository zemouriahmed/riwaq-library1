-- =====================================================================
-- Smart Library — Migration 1: schema
-- Tables, foreign keys, unique constraints, indexes, timestamps.
-- Requires PostgreSQL 15+ (Supabase default) for ON DELETE SET NULL (col).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- generic updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- subscription plans (configurable by admins) ----------
create table public.plans (
  id                  text primary key,
  name                text not null,
  storage_quota_bytes bigint not null check (storage_quota_bytes > 0),
  max_books           integer not null check (max_books > 0),
  max_shelves         integer check (max_shelves is null or max_shelves > 0), -- null = unlimited
  sort_order          integer not null default 0,
  updated_at          timestamptz not null default now()
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

insert into public.plans (id, name, storage_quota_bytes, max_books, max_shelves, sort_order) values
  ('free',   'FREE',   524288000,    10,  3,    1),   -- 500 MB
  ('silver', 'SILVER', 5368709120,   100, 20,   2),   -- 5 GB
  ('gold',   'GOLD',   21474836480,  500, null, 3);   -- 20 GB

-- ---------- profiles ----------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  avatar_url         text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'fr')),
  ui_theme           text not null default 'light' check (ui_theme in ('light', 'dark')),
  reader_theme       text not null default 'light' check (reader_theme in ('light', 'dark', 'sepia')),
  reading_direction  text not null default 'auto'  check (reading_direction in ('auto', 'ltr', 'rtl')),
  plan_id            text not null default 'free' references public.plans (id),
  is_admin           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- categories ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id) -- target for composite ownership foreign keys
);

create index categories_user_idx on public.categories (user_id);

-- ---------- books ----------
create table public.books (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 500),
  author           text check (author is null or char_length(author) <= 300),
  description      text,
  language         text,
  publication_date text,
  cover_path       text,
  file_path        text not null,
  file_format      text not null check (file_format in ('pdf', 'epub')),
  file_size        bigint not null default 0 check (file_size >= 0),
  file_hash        text, -- SHA-256 computed client-side, used for duplicate detection
  total_pages      integer check (total_pages is null or total_pages >= 0),
  category_id      uuid,
  reading_status   text not null default 'not_started'
                     check (reading_status in ('not_started', 'reading', 'completed')),
  is_favorite      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_opened_at   timestamptz,
  unique (id, user_id),
  unique (file_path),
  -- a book can only point to a category owned by the same user;
  -- deleting the category only clears category_id (never the user_id)
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id)
);

create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create index books_user_created_idx   on public.books (user_id, created_at desc);
create index books_user_opened_idx    on public.books (user_id, last_opened_at desc nulls last);
create index books_user_status_idx    on public.books (user_id, reading_status);
create index books_user_favorite_idx  on public.books (user_id) where is_favorite;
create index books_user_category_idx  on public.books (user_id, category_id);
create unique index books_user_hash_uidx on public.books (user_id, file_hash) where file_hash is not null;
-- trigram-free search helper: lower-cased title/author for ilike filtering
create index books_user_title_idx on public.books (user_id, lower(title));

-- ---------- shelves ----------
create table public.shelves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text,
  cover_color text check (cover_color is null or cover_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create index shelves_user_idx on public.shelves (user_id);

-- ---------- book_shelves (many-to-many) ----------
create table public.book_shelves (
  id       uuid primary key default gen_random_uuid(),
  book_id  uuid not null,
  shelf_id uuid not null,
  user_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, shelf_id),
  foreign key (book_id, user_id)  references public.books (id, user_id)   on delete cascade,
  foreign key (shelf_id, user_id) references public.shelves (id, user_id) on delete cascade
);

create index book_shelves_shelf_idx on public.book_shelves (shelf_id);
create index book_shelves_user_idx  on public.book_shelves (user_id);

-- ---------- reading_progress ----------
create table public.reading_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  book_id          uuid not null,
  current_page     integer check (current_page is null or current_page >= 0),
  epub_location    text,  -- EPUB CFI
  progress_percent numeric(5, 2) not null default 0 check (progress_percent between 0 and 100),
  device_id        text,  -- last device that wrote this row (for sync conflict handling)
  last_read_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, book_id),
  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

create trigger reading_progress_set_updated_at
  before update on public.reading_progress
  for each row execute function public.set_updated_at();

create index reading_progress_user_read_idx on public.reading_progress (user_id, last_read_at desc);

-- ---------- bookmarks ----------
create table public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  book_id    uuid not null,
  location   text not null, -- page number (as text) or EPUB CFI
  label      text,
  created_at timestamptz not null default now(),
  unique (user_id, book_id, location),
  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

create index bookmarks_book_idx on public.bookmarks (book_id);

-- ---------- notes ----------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  book_id    uuid not null,
  location   text,
  content    text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create index notes_book_idx on public.notes (book_id);

-- ---------- offline_downloads ----------
create table public.offline_downloads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  book_id        uuid not null,
  device_id      text not null default 'default',
  file_size      bigint not null default 0 check (file_size >= 0),
  status         text not null default 'pending'
                   check (status in ('pending', 'downloading', 'completed', 'failed', 'removed')),
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, book_id, device_id),
  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

create index offline_downloads_user_idx on public.offline_downloads (user_id);

-- ---------- app configuration (admin-managed, non-secret) ----------
create table public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

insert into public.app_config (key, value) values
  ('max_upload_bytes',        to_jsonb(104857600)),  -- 100 MB per file
  ('book_inserts_per_hour',   to_jsonb(200)),        -- rate limit
  ('registration_enabled',    to_jsonb(true));

-- ---------- error log (written by clients, readable by admins only) ----------
create table public.error_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  source     text not null,
  message    text not null,
  context    jsonb,
  created_at timestamptz not null default now()
);

create index error_logs_created_idx on public.error_logs (created_at desc);
