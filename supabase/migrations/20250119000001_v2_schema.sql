-- V2 Schema Migration
-- Adds: Extended book fields, Content domain, Streak system

-- ============================================
-- PART 1: Extend Books Table
-- ============================================

alter table books add column if not exists publisher text;
alter table books add column if not exists publish_year smallint;
alter table books add column if not exists language text;
alter table books add column if not exists region_hint text;
alter table books add column if not exists isbn10 text;
alter table books add column if not exists isbn13 text;
alter table books add column if not exists cover text;

-- Add constraint for region_hint
alter table books drop constraint if exists books_region_hint_chk;
alter table books add constraint books_region_hint_chk
  check (region_hint is null or region_hint in ('HK', 'TW', 'CN', 'EN', 'OTHER'));

-- Index for region-based queries
create index if not exists ix_books_region_hint on books (region_hint) where region_hint is not null;

-- ============================================
-- PART 2: Content Domain
-- ============================================

-- Content resource type enum
do $$ begin
  create type content_resource_type as enum ('txt', 'epub', 'pdf', 'ocr');
exception
  when duplicate_object then null;
end $$;

-- Content resources table (metadata only - files stored in IndexedDB)
create table if not exists content_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  type content_resource_type not null,
  file_hash text not null,
  file_size_bytes bigint not null,
  original_filename text,
  parsed_structure jsonb,
  created_at timestamptz not null default now()
);

-- Unique constraint: one resource per book per hash
create unique index if not exists uq_content_resources_book_hash
on content_resources (user_id, book_id, file_hash);

-- Index for book lookup
create index if not exists ix_content_resources_book
on content_resources (book_id);

-- Reading progress per resource
create table if not exists reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references content_resources(id) on delete cascade,
  current_position jsonb not null default '{}',
  percentage_read smallint not null default 0,
  last_read_at timestamptz not null default now(),
  constraint reading_progress_percentage_chk check (percentage_read between 0 and 100)
);

-- Unique constraint: one progress per resource
create unique index if not exists uq_reading_progress_resource
on reading_progress (user_id, resource_id);

-- Annotation type enum
do $$ begin
  create type annotation_type as enum ('highlight', 'bookmark', 'note');
exception
  when duplicate_object then null;
end $$;

-- Annotations table
create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references content_resources(id) on delete cascade,
  type annotation_type not null,
  position_start jsonb not null,
  position_end jsonb,
  note text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for resource lookup
create index if not exists ix_annotations_resource
on annotations (resource_id);

-- ============================================
-- PART 3: Streak System
-- ============================================

-- Reading sessions table (for duration tracking)
create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid references content_resources(id) on delete set null,
  session_date date not null,
  session_start timestamptz not null,
  session_end timestamptz not null,
  duration_minutes smallint not null,
  created_at timestamptz not null default now(),
  constraint reading_sessions_duration_chk check (duration_minutes > 0)
);

-- Index for streak calculation
create index if not exists ix_reading_sessions_user_date
on reading_sessions (user_id, session_date desc);

-- Unique constraint for session upsert
create unique index if not exists uq_reading_sessions_user_start
on reading_sessions (user_id, session_start);

-- User settings table
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak_threshold_minutes smallint not null default 15,
  reader_font_size smallint not null default 16,
  reader_theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_chk check (reader_theme in ('light', 'dark'))
);

-- ============================================
-- PART 4: Row Level Security
-- ============================================

-- Content resources
alter table content_resources enable row level security;

drop policy if exists content_resources_select_own on content_resources;
create policy content_resources_select_own
on content_resources for select
using (auth.uid() = user_id);

drop policy if exists content_resources_insert_own on content_resources;
create policy content_resources_insert_own
on content_resources for insert
with check (auth.uid() = user_id);

drop policy if exists content_resources_delete_own on content_resources;
create policy content_resources_delete_own
on content_resources for delete
using (auth.uid() = user_id);

-- Reading progress
alter table reading_progress enable row level security;

drop policy if exists reading_progress_all_own on reading_progress;
create policy reading_progress_all_own
on reading_progress for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Annotations
alter table annotations enable row level security;

drop policy if exists annotations_all_own on annotations;
create policy annotations_all_own
on annotations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Reading sessions
alter table reading_sessions enable row level security;

drop policy if exists reading_sessions_all_own on reading_sessions;
create policy reading_sessions_all_own
on reading_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- User settings
alter table user_settings enable row level security;

drop policy if exists user_settings_all_own on user_settings;
create policy user_settings_all_own
on user_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
