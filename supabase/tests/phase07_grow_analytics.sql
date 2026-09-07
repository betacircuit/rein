begin;

select plan(29);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('17000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grow-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('17000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grow-outsider@example.com', '', now(), '{}', '{}', now(), now());

insert into public.accounts(
  id, owner_id, institution_name, nickname, account_type, current_balance,
  balance_as_of, included_in_totals
) values
  ('47000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 'mock bank', 'reserve', 'checking', 100000, '2026-09-03T09:00:00+09:00', true),
  ('47000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000001', 'mock invest', 'long term', 'investment', 300000, '2026-09-03T09:00:00+09:00', false);

insert into public.financial_transactions(
  id, owner_id, account_id, scope, direction, kind, amount, occurred_at, source
) values
  ('57000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', 'private', 'inflow', 'income', 500000, '2026-09-02T10:00:00+09:00', 'mock_sync'),
  ('57000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', 'private', 'outflow', 'expense', 100000, '2026-09-02T12:00:00+09:00', 'mock_sync');

insert into public.subscriptions(
  id, owner_id, scope, payment_account_id, name, category, status, decision,
  amount, billing_cycle, started_on, billing_anchor_on, next_billing_on
) values (
  '67000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001',
  'private', '47000000-0000-0000-0000-000000000001', 'local cloud', 'cloud_storage',
  'active', 'review', 50000, 'monthly', '2026-01-01', '2026-01-01', '2026-09-10'
);
insert into public.subscription_occurrences(
  id, subscription_id, period_start, period_end, due_on, expected_amount, status
) values (
  '77000000-0000-0000-0000-000000000001', '67000000-0000-0000-0000-000000000001',
  '2026-09-01', '2026-09-30', '2026-09-10', 50000, 'scheduled'
);

insert into public.students(
  id, owner_id, name, tutoring_type, subject, default_mode,
  default_fee_amount, default_duration_minutes, meet_strategy
) values (
  '87000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001',
  'analytics student', 'subject', 'math', 'online', 60000, 120, 'none'
);
insert into public.lessons(
  id, owner_id, student_id, starts_at, ends_at, status, mode, amount,
  prep_minutes, travel_minutes, meet_strategy, completed_at
) values (
  '97000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000001', '2026-09-02T18:00:00+09:00',
  '2026-09-02T20:00:00+09:00', 'completed', 'online', 60000, 30, 30, 'none',
  '2026-09-02T20:00:00+09:00'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"17000000-0000-0000-0000-000000000001","email":"grow-owner@example.com","role":"authenticated"}', true);

select ok('partially_completed' = any(enum_range(null::public.contribution_status)::text[]), 'GROW-004 partial contribution status exists');
select ok('cancelled' = any(enum_range(null::public.contribution_status)::text[]), 'GROW-004 cancelled contribution status exists');
select lives_ok(
  $$select public.upsert_grow_plan(
    'a7000000-0000-0000-0000-000000000001', 'fixed_amount', 200000, null,
    150000, 200000, '47000000-0000-0000-0000-000000000001',
    '47000000-0000-0000-0000-000000000002', 3
  )$$,
  'GROW-001 one actor-bound plan can be configured'
);
select is((select contribution_cap from public.grow_plans where id = 'a7000000-0000-0000-0000-000000000001'), 150000::bigint, 'GROW-011 fixed rule stores its cap');

select is((select settled_cash_income from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 500000::bigint, 'GROW-006 only settled cash income funds the plan');
select is((select private_expenses from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 100000::bigint, 'GROW-007 personal expense is subtracted once');
select is((select unpaid_subscription_obligations from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 50000::bigint, 'SUB-018 unpaid confirmed subscription obligation reduces surplus');
select is((select safety_reserve_topup from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 100000::bigint, 'GROW-002 safety reserve top-up is a separate bucket');
select is((select actual_cash_remaining from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 400000::bigint, 'GROW-008 actual cash remaining stays separate');
select is((select available_surplus from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 250000::bigint, 'GROW-005 actual available surplus is the primary formula result');

select lives_ok(
  $$select public.record_grow_contribution(
    'a7000000-0000-0000-0000-000000000001', '2026-09-01', 50000,
    '47000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000002',
    '2026-09-03T12:00:00+09:00', 'grow-september-part-1'
  )$$,
  'GROW-004 a partial contribution can be recorded'
);
select is((select status::text from public.investment_contributions where owner_id = auth.uid()), 'partially_completed', 'GROW-004 partial amount has explicit status');
select is((select count(*)::integer from public.financial_transactions where transfer_group_id is not null), 2, 'GROW-003 contribution is two transfer legs');
select lives_ok(
  $$select public.record_grow_contribution(
    'a7000000-0000-0000-0000-000000000001', '2026-09-01', 50000,
    '47000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000002',
    '2026-09-03T12:00:00+09:00', 'grow-september-part-1'
  )$$,
  'GROW-003 retrying an idempotency key succeeds without duplication'
);
select is((select count(*)::integer from public.financial_transactions where transfer_group_id is not null), 2, 'GROW-003 retry does not duplicate transfer legs');
select lives_ok(
  $$select public.record_grow_contribution(
    'a7000000-0000-0000-0000-000000000001', '2026-09-01', 100000,
    '47000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000002',
    '2026-09-03T13:00:00+09:00', 'grow-september-part-2'
  )$$,
  'GROW-004 the remaining contribution can be recorded'
);
select is((select status::text from public.investment_contributions where owner_id = auth.uid()), 'completed', 'GROW-004 full amount becomes completed');
select is((select completed_amount from public.investment_contributions where owner_id = auth.uid()), 150000::bigint, 'GROW-011 contribution cannot exceed fixed cap');
select is((select total_assets from public.v_asset_summary where owner_id = auth.uid()), 400000::bigint, 'MON-017 cash plus investment equals total assets despite transfers');
select is((select effective_hourly_income from public.v_tutoring_effective_hourly where owner_id = auth.uid()), 20000::bigint, 'TUT-018 effective hourly includes lesson prep and travel');

select lives_ok($$select public.dismiss_local_insight('manual-review-candidates')$$, 'SUB-017 deterministic local insight can be dismissed');
select is((select count(*)::integer from public.dismissed_insights), 1, 'SUB-017 dismissed insight is private persisted state');
select lives_ok($$select public.dismiss_local_insight('manual-review-candidates')$$, 'SUB-017 repeated dismissal is idempotent');
select is((select count(*)::integer from public.dismissed_insights), 1, 'SUB-017 repeated dismissal does not duplicate state');

update public.subscription_occurrences set status = 'skipped' where id = '77000000-0000-0000-0000-000000000001';
select is((select unpaid_subscription_obligations from public.available_surplus('17000000-0000-0000-0000-000000000001', '2026-09-01')), 0::bigint, 'SUB-018 paid or skipped obligations are not double-counted');
select lives_ok(
  $$select public.upsert_grow_plan(
    'a7000000-0000-0000-0000-000000000001', 'percentage', null, 2500,
    90000, 200000, '47000000-0000-0000-0000-000000000001',
    '47000000-0000-0000-0000-000000000002', 3
  )$$,
  'GROW-011 percentage rule can replace the fixed rule'
);
select is((select contribution_basis_points from public.grow_plans where owner_id = auth.uid() and is_active), 2500, 'GROW-011 percentage rule stores integer basis points');

select set_config('request.jwt.claims', '{"sub":"17000000-0000-0000-0000-000000000002","email":"grow-outsider@example.com","role":"authenticated"}', true);
select throws_ok(
  $$select public.upsert_grow_plan(
    'a7000000-0000-0000-0000-000000000002', 'fixed_amount', 10000, null,
    10000, 0, '47000000-0000-0000-0000-000000000001',
    '47000000-0000-0000-0000-000000000002', 1
  )$$,
  'P0001', 'reserve account not found or forbidden',
  'SEC-002 outsider cannot configure a plan with owner accounts'
);
select is((select count(*)::integer from public.grow_plans), 0, 'SEC-002 outsider cannot read owner Grow plans');

select * from finish();
rollback;
