begin;

select plan(17);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tutor@example.com', '', now(), '{}', '{}', now(), now()),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@example.com', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000001","email":"tutor@example.com","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.students(
      id, owner_id, name, tutoring_type, subject, default_mode,
      default_fee_amount, default_duration_minutes, meet_strategy
    ) values (
      '21000000-0000-0000-0000-000000000001', auth.uid(), '김민준', 'subject', 'math',
      'online', 60000, 120, 'google_generated'
    )$$,
  'TUT-001 owner can create a subject student'
);
select throws_ok(
  $$insert into public.students(
      owner_id, name, tutoring_type, subject, default_mode,
      default_fee_amount, default_duration_minutes, meet_strategy
    ) values (auth.uid(), '잘못된 학생', 'school_record', 'physics', 'online', 50000, 90, 'google_generated')$$,
  '23514', null, 'TUT-001 school record student cannot carry subject'
);
select throws_ok(
  $$insert into public.students(
      owner_id, name, tutoring_type, subject, default_mode,
      default_fee_amount, default_duration_minutes, meet_strategy
    ) values (auth.uid(), '장소 없음', 'subject', 'chemistry', 'in_person', 50000, 90, 'none')$$,
  '23514', null, 'TUT-005 in person student requires location'
);
select throws_ok(
  $$insert into public.students(
      owner_id, name, tutoring_type, subject, default_mode,
      default_fee_amount, default_duration_minutes, meet_strategy, manual_meet_url
    ) values (auth.uid(), '주소 오류', 'subject', 'math', 'online', 50000, 90, 'manual_reusable', 'http://example.com')$$,
  '23514', null, 'TUT-006 manual meeting URL requires HTTPS'
);

insert into public.tutoring_schedules(
  id, owner_id, student_id, weekday, start_time, duration_minutes, timezone, effective_from
) values (
  '31000000-0000-0000-0000-000000000001', auth.uid(),
  '21000000-0000-0000-0000-000000000001', 3, '18:00', 120, 'Asia/Seoul', '2026-09-01'
);

select is(
  public.materialize_tutoring_schedule('31000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30'),
  5,
  'TUT-004 weekly schedule creates September occurrences'
);
select is(
  public.materialize_tutoring_schedule('31000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30'),
  0,
  'TUT-004 repeated materialization is idempotent'
);
select is(
  (select count(*)::integer from public.lessons where schedule_id = '31000000-0000-0000-0000-000000000001'),
  5,
  'TUT-004 occurrence count remains stable'
);
select results_eq(
  $$select to_char(starts_at at time zone 'Asia/Seoul', 'HH24:MI') from public.lessons
    where schedule_id = '31000000-0000-0000-0000-000000000001' order by starts_at limit 1$$,
  array['18:00'::text],
  'TUT-004 recurrence keeps Seoul wall clock time'
);
select throws_ok(
  $$update public.lessons set amount = 70000
    where schedule_id = '31000000-0000-0000-0000-000000000001'$$,
  'P0001', 'lesson snapshot fields are immutable',
  'TUT-003 materialized lesson snapshot is immutable'
);
select lives_ok(
  $$update public.lessons set status = 'completed', completed_at = now()
    where id = (select id from public.lessons order by starts_at limit 1)$$,
  'TUT-008 scheduled lesson can become completed'
);
select throws_ok(
  $$update public.lessons set status = 'scheduled', completed_at = null
    where id = (select id from public.lessons where status = 'completed' limit 1)$$,
  'P0001', 'finished lesson status is immutable',
  'TUT-008 completed lesson cannot return to scheduled'
);
select lives_ok(
  $$insert into public.lesson_prep_items(lesson_id, label, sort_order)
    select id, '숙제 채점', 0 from public.lessons order by starts_at limit 1$$,
  'TUT-002 owner can add lesson preparation item'
);

select lives_ok(
  $$insert into public.personal_schedule_blocks(
      owner_id, title, weekday, start_time, duration_minutes, creation_order, color_index
    ) values
      (auth.uid(), '운동', 1, '08:00', 60, 999, 14),
      (auth.uid(), '동아리', 4, '19:00', 90, 999, 14)$$,
  'TUT-009 owner can create personal weekly blocks'
);
select results_eq(
  $$select creation_order::integer, color_index::integer
      from public.personal_schedule_blocks order by creation_order$$,
  $$values (1, 0), (2, 1)$$,
  'TUT-009 personal block colors follow server-assigned creation order'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000002","email":"other@example.com","role":"authenticated"}', true);
select is_empty('select id from public.students', 'SEC-002 outsider cannot read tutoring students');
select is_empty(
  'select id from public.personal_schedule_blocks',
  'SEC-002 outsider cannot read personal schedule blocks'
);
select throws_ok(
  $$select public.materialize_tutoring_schedule('31000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-30')$$,
  '42501', 'active tutoring schedule not found',
  'SEC-002 outsider cannot materialize owner schedule'
);
reset role;

select * from finish();
rollback;
