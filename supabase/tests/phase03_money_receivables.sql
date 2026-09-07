begin;

select plan(20);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-outsider@example.com', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"13000000-0000-0000-0000-000000000001","email":"money-owner@example.com","role":"authenticated"}', true);

insert into public.students(
  id, owner_id, name, tutoring_type, subject, default_mode,
  default_fee_amount, default_duration_minutes, meet_strategy
) values (
  '23000000-0000-0000-0000-000000000001', auth.uid(), '김민준', 'subject', 'math',
  'online', 60000, 120, 'google_generated'
);
insert into public.lessons(id, owner_id, student_id, starts_at, ends_at, mode, amount)
values
  ('33000000-0000-0000-0000-000000000001', auth.uid(), '23000000-0000-0000-0000-000000000001', '2026-09-01 18:00+09', '2026-09-01 20:00+09', 'online', 60000),
  ('33000000-0000-0000-0000-000000000002', auth.uid(), '23000000-0000-0000-0000-000000000001', '2026-09-08 18:00+09', '2026-09-08 20:00+09', 'online', 50000),
  ('33000000-0000-0000-0000-000000000003', auth.uid(), '23000000-0000-0000-0000-000000000001', '2026-09-15 18:00+09', '2026-09-15 20:00+09', 'online', 20000);

select lives_ok(
  $$select public.complete_lesson('33000000-0000-0000-0000-000000000001')$$,
  'TUT-014 completed lesson creates a receivable'
);
select is(
  (select count(*)::integer from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000001'),
  1,
  'TUT-014 complete lesson creates exactly one receivable'
);
select is(
  (select (public.complete_lesson('33000000-0000-0000-0000-000000000001')).id),
  (select id from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000001'),
  'TUT-014 repeated completion is idempotent'
);
select is(
  (select count(*)::integer from public.financial_transactions),
  0,
  'MON-020 unpaid tutoring is not cash income'
);

insert into public.accounts(
  id, owner_id, institution_name, nickname, account_type, masked_account_number,
  provider, current_balance, included_in_totals
) values
  ('43000000-0000-0000-0000-000000000001', auth.uid(), '테스트 은행', '생활비', 'checking', '•••• 1234', 'mock', 100000, true),
  ('43000000-0000-0000-0000-000000000002', auth.uid(), '테스트 은행', '저축', 'savings', '•••• 5678', 'mock', 0, true);
select is((select count(*)::integer from public.accounts), 2, 'MON-002 owner can store masked accounts');

insert into public.financial_transactions(
  id, owner_id, account_id, category_id, direction, kind, amount, occurred_at, source, counterparty
) values
  ('53000000-0000-0000-0000-000000000001', auth.uid(), '43000000-0000-0000-0000-000000000001', (select id from public.transaction_categories where owner_id is null and code = 'tutoring'), 'inflow', 'income', 40000, '2026-09-02 09:00+09', 'mock_sync', '김민준 어머니'),
  ('53000000-0000-0000-0000-000000000002', auth.uid(), '43000000-0000-0000-0000-000000000001', (select id from public.transaction_categories where owner_id is null and code = 'tutoring'), 'inflow', 'income', 20000, '2026-09-03 09:00+09', 'mock_sync', '김민준 어머니'),
  ('53000000-0000-0000-0000-000000000003', auth.uid(), '43000000-0000-0000-0000-000000000001', (select id from public.transaction_categories where owner_id is null and code = 'tutoring'), 'inflow', 'income', 20000, '2026-09-15 21:00+09', 'mock_sync', '김민준 어머니');

select lives_ok(
  $$insert into public.receivable_allocations(receivable_id, transaction_id, amount, created_by)
    values ((select id from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000001'), '53000000-0000-0000-0000-000000000001', 40000, auth.uid())$$,
  'TUT-016 partial allocation succeeds'
);
select is((select status::text from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000001'), 'partially_paid', 'TUT-016 partial allocation updates status');
select lives_ok(
  $$insert into public.receivable_allocations(receivable_id, transaction_id, amount, created_by)
    values ((select id from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000001'), '53000000-0000-0000-0000-000000000002', 20000, auth.uid())$$,
  'TUT-016 combined allocations succeed'
);
select is((select status::text from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000001'), 'paid', 'TUT-016 combined allocations mark paid');

select public.complete_lesson('33000000-0000-0000-0000-000000000002');
select throws_ok(
  $$insert into public.receivable_allocations(receivable_id, transaction_id, amount, created_by)
    values ((select id from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000002'), '53000000-0000-0000-0000-000000000002', 1, auth.uid())$$,
  'P0001', 'allocation exceeds transaction amount',
  'TUT-016 allocation cannot exceed transaction amount'
);

select lives_ok(
  $$select public.record_internal_transfer('43000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', 10000, now(), '저축 이동')$$,
  'MON-005 transfer creates linked legs'
);
select is((select count(*)::integer from public.financial_transactions where kind = 'transfer'), 2, 'MON-005 transfer has exactly two legs');
select is((select coalesce(sum(case when direction = 'inflow' then amount else -amount end), 0)::bigint from public.financial_transactions where kind = 'transfer'), 0::bigint, 'MON-006 transfer has no net cash effect');

select is(
  public.import_financial_transactions_csv(
    '43000000-0000-0000-0000-000000000001',
    '[{"fingerprint":"csv-phase03-one","occurred_at":"2026-09-20T12:00:00+09:00","direction":"outflow","amount":12000,"counterparty":"학생식당","descriptor":"점심"}]'::jsonb
  ),
  1,
  'MON-013 validated CSV batch imports atomically'
);
select is(
  public.import_financial_transactions_csv(
    '43000000-0000-0000-0000-000000000001',
    '[{"fingerprint":"csv-phase03-one","occurred_at":"2026-09-20T12:00:00+09:00","direction":"outflow","amount":12000,"counterparty":"학생식당","descriptor":"점심"}]'::jsonb
  ),
  0,
  'MON-014 repeated CSV import is idempotent'
);

select public.complete_lesson('33000000-0000-0000-0000-000000000003');
insert into public.match_suggestions(
  id, owner_id, transaction_id, target_kind, target_id, confidence, evidence
) values (
  '63000000-0000-0000-0000-000000000001', auth.uid(), '53000000-0000-0000-0000-000000000003',
  'receivable', (select id from public.receivables where lesson_id = '33000000-0000-0000-0000-000000000003'),
  0.95, '{"amount":"same","alias":"same","timing":"near"}'
);
select is((select count(*)::integer from public.receivable_allocations where transaction_id = '53000000-0000-0000-0000-000000000003'), 0, 'TUT-017 suggestion alone does not allocate');
select lives_ok($$select public.confirm_receivable_match('63000000-0000-0000-0000-000000000001')$$, 'TUT-017 explicit confirmation allocates');
select is((select status::text from public.match_suggestions where id = '63000000-0000-0000-0000-000000000001'), 'confirmed', 'TUT-017 confirmed suggestion records decision');
select ok(
  exists(
    select 1 from public.audit_events
    where entity_type = 'reconciliation_decision'
      and entity_id = '63000000-0000-0000-0000-000000000001'
      and actor_id = auth.uid()
      and before_data ->> 'status' = 'suggested'
      and after_data ->> 'status' = 'confirmed'
      and after_data ->> 'linked_transaction_id' = '53000000-0000-0000-0000-000000000003'
      and metadata ->> 'source' = 'match_suggestion'
  ),
  'SEC-012 receivable match audit retains actor source and prior/new linkage'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"13000000-0000-0000-0000-000000000002","email":"money-outsider@example.com","role":"authenticated"}', true);
select is_empty('select id from public.accounts', 'SEC-002 outsider cannot read owner money accounts');
reset role;

select * from finish();
rollback;
