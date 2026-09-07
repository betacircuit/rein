-- Students are now created from four fields (name, mode, grade, hourly rate) and
-- filled in later, so the hourly rate becomes the stored contract value and the
-- per-lesson fee is derived from it.

alter table public.students
  add column if not exists hourly_rate bigint;

update public.students
set hourly_rate = greatest(
  1,
  round(default_fee_amount::numeric * 60 / nullif(default_duration_minutes, 0))
)
where hourly_rate is null;

alter table public.students
  alter column hourly_rate set not null;

alter table public.students
  drop constraint if exists students_hourly_rate_positive;

alter table public.students
  add constraint students_hourly_rate_positive check (hourly_rate > 0);

-- A student can be added before a visiting address is agreed on, so the location
-- requirement moves to lesson creation instead of student creation.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.students'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%in_person%'
    and pg_get_constraintdef(oid) ilike '%default_location%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.students drop constraint %I', constraint_name);
  end if;
end $$;
