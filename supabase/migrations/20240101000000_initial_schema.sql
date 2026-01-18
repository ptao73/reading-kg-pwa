create extension if not exists "pgcrypto";

do $$ begin
  create type reading_event_type as enum ('finished', 'ended', 'correction');
exception
  when duplicate_object then null;
end $$;

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  isbn text,
  merged_into uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table books
  drop constraint if exists books_merged_into_fkey;
alter table books
  add constraint books_merged_into_fkey
  foreign key (merged_into) references books(id);

create table if not exists reading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id),
  event_type reading_event_type not null,
  occurred_at timestamptz not null,
  completion int not null,
  target_event_id uuid null,
  client_event_id uuid not null,
  created_at timestamptz not null default now()
);

alter table reading_events
  drop constraint if exists reading_events_target_event_fkey;
alter table reading_events
  add constraint reading_events_target_event_fkey
  foreign key (target_event_id) references reading_events(id);

alter table reading_events
  drop constraint if exists reading_events_completion_chk;
alter table reading_events
  add constraint reading_events_completion_chk
  check (
    (event_type = 'finished' and completion = 100)
    or (event_type = 'ended' and completion between 0 and 99)
    or (event_type = 'correction' and completion between 0 and 100)
  );

alter table reading_events
  drop constraint if exists reading_events_correction_target_chk;
alter table reading_events
  add constraint reading_events_correction_target_chk
  check (
    (event_type != 'correction' and target_event_id is null)
    or (event_type = 'correction' and target_event_id is not null)
  );

alter table reading_events
  drop constraint if exists reading_events_correction_not_self_chk;
alter table reading_events
  add constraint reading_events_correction_not_self_chk
  check (target_event_id is null or target_event_id != id);

create unique index if not exists uq_reading_events_user_client_event
on reading_events (user_id, client_event_id);

create index if not exists ix_reading_events_user_occurred
on reading_events (user_id, occurred_at desc);

create index if not exists ix_books_user_created
on books (user_id, created_at desc);

alter table books enable row level security;
alter table reading_events enable row level security;

drop policy if exists books_select_own on books;
create policy books_select_own
on books for select
using (auth.uid() = user_id);

drop policy if exists books_insert_own on books;
create policy books_insert_own
on books for insert
with check (auth.uid() = user_id);

drop policy if exists books_update_own on books;
create policy books_update_own
on books for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- reading_events: strict append-only (no UPDATE/DELETE policies)
drop policy if exists events_select_own on reading_events;
create policy events_select_own
on reading_events for select
using (auth.uid() = user_id);

drop policy if exists events_insert_own on reading_events;
create policy events_insert_own
on reading_events for insert
with check (auth.uid() = user_id);

create or replace view valid_reading_events as
select e.*
from reading_events e
where e.event_type != 'correction'
and not exists (
  select 1
  from reading_events c
  where c.event_type = 'correction'
    and c.target_event_id = e.id
    and c.user_id = e.user_id
);
