create table public.personal_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 600),
  timezone text not null default 'Asia/Seoul' check (timezone = 'Asia/Seoul'),
  creation_order bigint not null,
  color_index smallint not null check (color_index between 0 and 14),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, creation_order)
);

create index personal_schedule_blocks_owner_weekday_time
  on public.personal_schedule_blocks(owner_id, weekday, start_time)
  where is_active;

create or replace function public.assign_personal_schedule_creation_order()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Serialize only this owner's inserts so two concurrent saves cannot receive
  -- the same creation order or skip the intended 15-colour rotation.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
  select coalesce(max(block.creation_order), 0) + 1
    into new.creation_order
    from public.personal_schedule_blocks block
   where block.owner_id = new.owner_id;
  new.color_index := mod(new.creation_order - 1, 15)::smallint;
  return new;
end;
$$;

create trigger assign_personal_schedule_creation_order
before insert on public.personal_schedule_blocks
for each row execute function public.assign_personal_schedule_creation_order();

create trigger set_personal_schedule_blocks_updated_at
before update on public.personal_schedule_blocks
for each row execute function public.set_updated_at();

alter table public.personal_schedule_blocks enable row level security;

create policy personal_schedule_blocks_owner_all
on public.personal_schedule_blocks
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant select, insert, update on public.personal_schedule_blocks to authenticated;
grant execute on function public.assign_personal_schedule_creation_order() to authenticated;
