-- V0.2.1: safe for both a new database and an existing V0.2 database.
-- Existing rows and their content/status/timestamps are not rewritten.
begin;

create table if not exists public.ideas (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  status text not null check (status in ('parked', 'moved')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

alter table public.ideas add column if not exists deleted_at timestamptz;

create index if not exists ideas_user_created_at_idx
  on public.ideas (user_id, created_at desc);

create index if not exists ideas_deleted_at_idx
  on public.ideas (deleted_at) where deleted_at is not null;

alter table public.ideas enable row level security;
grant usage on schema public to authenticated;
revoke all on table public.ideas from public, anon, authenticated;
grant select on table public.ideas to authenticated;
grant insert (id, user_id, content, status, created_at, updated_at)
  on public.ideas to authenticated;
grant update (content, status, updated_at) on public.ideas to authenticated;

drop policy if exists "Users can read their own ideas" on public.ideas;
drop policy if exists "Users can create their own ideas" on public.ideas;
drop policy if exists "Users can update their own ideas" on public.ideas;
drop policy if exists "Users can delete their own ideas" on public.ideas;

create policy "Users can read their own ideas"
  on public.ideas for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own ideas"
  on public.ideas for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own ideas"
  on public.ideas for update to authenticated
  using ((select auth.uid()) = user_id and deleted_at is null)
  with check ((select auth.uid()) = user_id and deleted_at is null);

-- Only these narrowly scoped functions may change deleted_at. They explicitly
-- check the JWT's user even though the function owner bypasses table RLS.
create or replace function public.trash_idea(p_idea_id uuid)
returns setof public.ideas
language sql
security definer
set search_path = ''
as $$
  update public.ideas
  set deleted_at = coalesce(deleted_at, statement_timestamp()),
      updated_at = case when deleted_at is null then statement_timestamp() else updated_at end
  where id = p_idea_id and user_id = (select auth.uid())
  returning *;
$$;

create or replace function public.restore_idea(p_idea_id uuid)
returns setof public.ideas
language sql
security definer
set search_path = ''
as $$
  update public.ideas
  set deleted_at = null,
      updated_at = case when deleted_at is null then updated_at else statement_timestamp() end
  where id = p_idea_id and user_id = (select auth.uid())
    and (deleted_at is null or deleted_at > statement_timestamp() - interval '168 hours')
  returning *;
$$;

revoke all on function public.trash_idea(uuid) from public, anon, authenticated;
revoke all on function public.restore_idea(uuid) from public, anon, authenticated;
grant execute on function public.trash_idea(uuid) to authenticated;
grant execute on function public.restore_idea(uuid) to authenticated;

commit;
