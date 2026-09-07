-- Phase 02: tutoring invariants, immutable lesson snapshots, and deterministic recurrence.

alter table public.students
  add constraint students_name_not_blank check (nullif(trim(name), '') is not null),
  add constraint students_mode_resource_shape check (
    (
      default_mode = 'in_person'
      and nullif(trim(default_location), '') is not null
      and meet_strategy = 'none'
      and manual_meet_url is null
    )
    or (
      default_mode = 'online'
      and default_location is null
      and meet_strategy = 'google_generated'
      and manual_meet_url is null
    )
    or (
      default_mode = 'online'
      and default_location is null
      and meet_strategy = 'manual_reusable'
      and manual_meet_url ~* '^https://'
    )
  );

alter table public.tutoring_schedules
  add constraint tutoring_schedules_seoul_timezone check (timezone = 'Asia/Seoul');

alter table public.lessons
  add constraint lessons_seoul_timezone check (timezone = 'Asia/Seoul'),
  add constraint lessons_calendar_sync_state check (
    calendar_sync_state in ('not_synced', 'synced', 'error')
  ),
  add constraint lessons_mode_resource_shape check (
    (
      mode = 'in_person'
      and nullif(trim(in_person_location), '') is not null
      and meet_strategy = 'none'
      and meet_url is null
    )
    or (
      mode = 'online'
      and in_person_location is null
      and meet_strategy = 'google_generated'
      and (meet_url is null or meet_url ~* '^https://')
    )
    or (
      mode = 'online'
      and in_person_location is null
      and meet_strategy = 'manual_reusable'
      and meet_url ~* '^https://'
    )
  ),
  add constraint lessons_status_timestamp_shape check (
    (status = 'scheduled' and completed_at is null and cancelled_at is null)
    or (status = 'completed' and completed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and completed_at is null and cancelled_at is not null)
  );

alter table public.lesson_prep_items
  add constraint lesson_prep_items_label_not_blank check (nullif(trim(label), '') is not null);

create or replace function public.validate_lesson_schedule_relation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_schedule_owner uuid;
  v_schedule_student uuid;
begin
  if new.schedule_id is null then
    return new;
  end if;

  select owner_id, student_id
    into v_schedule_owner, v_schedule_student
    from public.tutoring_schedules
   where id = new.schedule_id;

  if v_schedule_owner is distinct from new.owner_id
     or v_schedule_student is distinct from new.student_id then
    raise exception 'lesson schedule boundary mismatch';
  end if;
  return new;
end;
$$;

create trigger validate_lesson_schedule_relation
before insert or update of owner_id, student_id, schedule_id on public.lessons
for each row execute function public.validate_lesson_schedule_relation();

create or replace function public.protect_lesson_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.student_id is distinct from old.student_id
     or new.schedule_id is distinct from old.schedule_id
     or new.occurrence_key is distinct from old.occurrence_key
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.timezone is distinct from old.timezone
     or new.mode is distinct from old.mode
     or new.amount is distinct from old.amount
     or new.in_person_location is distinct from old.in_person_location
     or new.meet_strategy is distinct from old.meet_strategy then
    raise exception 'lesson snapshot fields are immutable';
  end if;
  return new;
end;
$$;

create trigger protect_lesson_snapshot
before update on public.lessons
for each row execute function public.protect_lesson_snapshot();

create or replace function public.protect_lesson_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'scheduled' and new.status <> old.status then
    raise exception 'finished lesson status is immutable';
  end if;
  return new;
end;
$$;

create trigger protect_lesson_status_transition
before update of status on public.lessons
for each row execute function public.protect_lesson_status_transition();

create or replace function public.materialize_tutoring_schedule(
  p_schedule_id uuid,
  p_from date,
  p_until date
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_schedule public.tutoring_schedules%rowtype;
  v_student public.students%rowtype;
  v_inserted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_until < p_from then
    raise exception 'invalid materialization range';
  end if;

  select * into v_schedule
    from public.tutoring_schedules
   where id = p_schedule_id
     and owner_id = auth.uid()
     and is_active;
  if not found then
    raise exception 'active tutoring schedule not found' using errcode = '42501';
  end if;

  select * into v_student
    from public.students
   where id = v_schedule.student_id
     and owner_id = auth.uid();
  if not found then
    raise exception 'student not found' using errcode = '42501';
  end if;

  insert into public.lessons(
    owner_id, student_id, schedule_id, occurrence_key,
    starts_at, ends_at, timezone, mode, amount,
    in_person_location, meet_strategy, meet_url
  )
  select
    v_schedule.owner_id,
    v_schedule.student_id,
    v_schedule.id,
    v_schedule.id::text || ':' || day::date::text,
    (day::date + v_schedule.start_time) at time zone v_schedule.timezone,
    ((day::date + v_schedule.start_time) at time zone v_schedule.timezone)
      + make_interval(mins => v_schedule.duration_minutes),
    v_schedule.timezone,
    coalesce(v_schedule.mode_override, v_student.default_mode),
    v_student.default_fee_amount,
    case
      when coalesce(v_schedule.mode_override, v_student.default_mode) = 'in_person'
        then coalesce(v_schedule.location_override, v_student.default_location)
      else null
    end,
    case
      when coalesce(v_schedule.mode_override, v_student.default_mode) = 'in_person'
        then 'none'::public.meet_strategy
      else coalesce(v_schedule.meet_strategy_override, v_student.meet_strategy)
    end,
    case
      when coalesce(v_schedule.mode_override, v_student.default_mode) = 'online'
       and coalesce(v_schedule.meet_strategy_override, v_student.meet_strategy) = 'manual_reusable'
        then v_student.manual_meet_url
      else null
    end
  from generate_series(
    greatest(p_from, v_schedule.effective_from)::timestamp,
    least(p_until, coalesce(v_schedule.effective_until, p_until))::timestamp,
    interval '1 day'
  ) as day
  where extract(dow from day)::smallint = v_schedule.weekday
  on conflict (owner_id, occurrence_key) where occurrence_key is not null do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.materialize_tutoring_schedule(uuid, date, date) from public;
grant execute on function public.materialize_tutoring_schedule(uuid, date, date) to authenticated;
