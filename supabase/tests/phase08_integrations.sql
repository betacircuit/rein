begin;

select plan(30);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('18000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'integration-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('18000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'integration-outsider@example.com', '', now(), '{}', '{}', now(), now());

insert into public.students(
  id, owner_id, name, tutoring_type, subject, default_mode,
  default_fee_amount, default_duration_minutes, meet_strategy
) values
  ('28000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 'owner student', 'subject', 'math', 'online', 60000, 120, 'google_generated'),
  ('28000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', 'outsider student', 'subject', 'math', 'online', 60000, 120, 'google_generated');
insert into public.lessons(
  id, owner_id, student_id, starts_at, ends_at, status, mode, amount, meet_strategy
) values
  ('38000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000001', '2026-09-03T18:00:00+09:00', '2026-09-03T20:00:00+09:00', 'scheduled', 'online', 60000, 'google_generated'),
  ('38000000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000002', '2026-09-04T18:00:00+09:00', '2026-09-04T20:00:00+09:00', 'scheduled', 'online', 60000, 'google_generated');

select ok(
  exists(select 1 from pg_constraint where conname = 'external_connections_production_kftc_disabled'),
  'MON-012 production KFTC has a database hard gate'
);
select ok(
  exists(select 1 from pg_constraint where conname = 'external_connections_secret_reference_only'),
  'SEC-003 only encrypted secret references are allowed'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"18000000-0000-0000-0000-000000000001","email":"integration-owner@example.com","role":"authenticated"}', true);

select lives_ok(
  $$select public.connect_mock_integration('google_calendar')$$,
  'INT-001 minimum-scope Calendar mock can connect without credentials'
);
select is(
  (select scopes from public.external_connections where kind = 'google_calendar'),
  array['https://www.googleapis.com/auth/calendar.events']::text[],
  'INT-001 Calendar connection stores only the event scope'
);
select is(
  (select secret_reference from public.external_connections where kind = 'google_calendar'),
  null::text,
  'SEC-003 mock connection stores no token or secret'
);
select lives_ok(
  $$select public.connect_mock_integration('bank')$$,
  'INT-006 read-only bank mock can connect without credentials'
);
select is(
  (select scopes from public.external_connections where kind = 'bank'),
  array['account_discovery','balance_inquiry','transaction_history']::text[],
  'MON-010 bank connection has inquiry-only capabilities'
);
select throws_ok(
  $$insert into public.external_connections(owner_id, kind, provider) values (auth.uid(), 'bank', 'mock')$$,
  '42501', 'permission denied for table external_connections',
  'SEC-005 clients cannot bypass actor-bound connection commands'
);

select lives_ok(
  $$select public.begin_integration_sync(
    (select id from public.external_connections where kind = 'bank'), 'bank-sync-2026-09-03'
  )$$,
  'INT-007 sync attempt is recorded'
);
select is(
  public.begin_integration_sync(
    (select id from public.external_connections where kind = 'bank'), 'bank-sync-2026-09-03'
  ),
  (select id from public.sync_runs where idempotency_key = 'bank-sync-2026-09-03'),
  'INT-008 duplicate request returns the same sync run'
);
select is(
  (select count(*)::integer from public.sync_runs where idempotency_key = 'bank-sync-2026-09-03'),
  1,
  'INT-008 retry does not duplicate a sync run'
);
select isnt(
  (select last_attempt_at from public.external_connections where kind = 'bank'),
  null::timestamptz,
  'INT-007 last attempt is visible'
);
select lives_ok(
  $$select public.complete_integration_sync(
    (select id from public.sync_runs where idempotency_key = 'bank-sync-2026-09-03'),
    'failed', null, 0, 0, 'rate_limited',
    'Bearer secret-token fintech_use_num=1234567890123456'
  )$$,
  'INT-008 provider failure can be completed safely'
);
select is(
  (select status::text from public.sync_runs where idempotency_key = 'bank-sync-2026-09-03'),
  'failed',
  'INT-008 provider error has a terminal state'
);
select is(
  (select redacted_error from public.sync_runs where idempotency_key = 'bank-sync-2026-09-03'),
  'Bearer [REDACTED] fintech_use_num=[REDACTED]',
  'SEC-003 structured sync errors redact tokens and fintech numbers'
);
select is(
  (select status::text from public.external_connections where kind = 'bank'),
  'error',
  'INT-007 failed sync exposes an actionable connection state'
);
select lives_ok(
  $$select public.connect_mock_integration('bank')$$,
  'INT-006 mock bank can recover from an error state'
);
select lives_ok(
  $$select public.begin_integration_sync(
    (select id from public.external_connections where kind = 'bank'), 'bank-sync-recovery'
  )$$,
  'INT-005 incremental recovery sync can start'
);
select lives_ok(
  $$select public.complete_integration_sync(
    (select id from public.sync_runs where idempotency_key = 'bank-sync-recovery'),
    'succeeded', 'cursor-final', 3, 1, null, null
  )$$,
  'INT-005 paginated sync stores its final cursor and counts'
);
select is(
  (select cursor_after from public.sync_runs where idempotency_key = 'bank-sync-recovery'),
  'cursor-final',
  'INT-005 incremental cursor is retained for the next sync'
);
select is(
  (select imported_count from public.sync_runs where idempotency_key = 'bank-sync-recovery'),
  3,
  'INT-005 imported count excludes skipped duplicate rows'
);
select isnt(
  (select last_success_at from public.external_connections where kind = 'bank'),
  null::timestamptz,
  'INT-007 last success is visible'
);

select lives_ok(
  $$update public.lessons set
    calendar_connection_id = (select id from public.external_connections where kind = 'google_calendar'),
    google_calendar_event_id = 'studentos-stable-event',
    google_calendar_html_url = 'https://calendar.google.test/event',
    calendar_conference_request_id = 'meet-unique-request',
    calendar_event_ownership = 'app_created',
    calendar_sync_state = 'synced'
  where id = '38000000-0000-0000-0000-000000000001'$$,
  'INT-002 app event IDs and sync state are stored together'
);
select is(
  (select calendar_event_ownership from public.lessons where id = '38000000-0000-0000-0000-000000000001'),
  'app_created',
  'INT-003 Calendar mutation ownership is explicit'
);
select lives_ok(
  $$select public.disconnect_integration(
    (select id from public.external_connections where kind = 'bank')
  )$$,
  'SEC-005 owner can explicitly disconnect and revoke'
);
select is(
  (select status::text from public.external_connections where kind = 'bank'),
  'revoked',
  'SEC-005 disconnect records revoked state'
);
select is(
  (select scopes from public.external_connections where kind = 'bank'),
  '{}'::text[],
  'SEC-005 disconnect removes granted scopes'
);
select is(
  (select secret_reference from public.external_connections where kind = 'bank'),
  null::text,
  'SEC-003 disconnect clears the server secret reference'
);

select set_config('request.jwt.claims', '{"sub":"18000000-0000-0000-0000-000000000002","email":"integration-outsider@example.com","role":"authenticated"}', true);
select is_empty(
  'select id from public.external_connections',
  'SEC-005 outsider cannot read owner integration state'
);
select throws_ok(
  $$select public.disconnect_integration(
    '00000000-0000-0000-0000-000000000000'
  )$$,
  'P0001', 'integration not found or forbidden',
  'SEC-005 outsider cannot revoke another connection'
);

select * from finish();
rollback;
