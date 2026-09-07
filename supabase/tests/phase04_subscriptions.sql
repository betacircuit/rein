begin;

select plan(31);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'subscription-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'subscription-roommate@example.com', '', now(), '{}', '{}', now(), now()),
  ('14000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'subscription-outsider@example.com', '', now(), '{}', '{}', now(), now());

insert into public.households(id, name, created_by)
values ('24000000-0000-0000-0000-000000000001', '구독 테스트 집', '14000000-0000-0000-0000-000000000001');
insert into public.household_members(id, household_id, user_id, display_name, role, status, joined_at)
values
  ('34000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '나', 'owner', 'active', now()),
  ('34000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '룸메이트', 'member', 'active', now());
insert into public.accounts(id, owner_id, institution_name, nickname, account_type)
values ('44000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '테스트 은행', '생활비', 'checking');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"14000000-0000-0000-0000-000000000001","email":"subscription-owner@example.com","role":"authenticated"}', true);

select is(round(public.subscription_monthly_equivalent(12000, 'monthly')), 12000::numeric, 'SUB-006 monthly normalization');
select is(round(public.subscription_monthly_equivalent(36000, 'quarterly')), 12000::numeric, 'SUB-006 quarterly normalization');
select is(round(public.subscription_monthly_equivalent(12000, 'yearly')), 1000::numeric, 'SUB-006 yearly normalization');
select is(public.next_subscription_due('2026-02-28', '2026-01-31', 'monthly'), '2026-03-31'::date, 'SUB-006 month-end anchor survives February');
select is(public.next_subscription_due('2027-02-28', '2024-02-29', 'yearly'), '2028-02-29'::date, 'SUB-006 leap-day anchor returns in leap year');

select throws_ok(
  $$insert into public.subscriptions(owner_id, scope, name, amount, billing_cycle, billing_anchor_on, reminder_days_before)
    values (auth.uid(), 'private', '중복 알림', 1000, 'monthly', '2026-09-01', '{7,7}')$$,
  'P0001', 'subscription reminder days must be unique',
  'SUB-007 duplicate reminders are rejected'
);
select throws_ok(
  $$insert into public.subscriptions(owner_id, scope, name, amount, billing_cycle, billing_anchor_on, service_url)
    values (auth.uid(), 'private', '안전하지 않은 주소', 1000, 'monthly', '2026-09-01', 'http://example.com')$$,
  'P0001', 'subscription service URL must use HTTPS',
  'SUB-010 service URL requires HTTPS'
);

insert into public.subscriptions(
  id, owner_id, household_id, scope, payer_member_id, payment_account_id,
  name, provider_name, plan_name, category, status, decision, amount, billing_cycle,
  started_on, billing_anchor_on, next_billing_on, descriptor_aliases, reminder_days_before
) values (
  '54000000-0000-0000-0000-000000000001', auth.uid(), '24000000-0000-0000-0000-000000000001',
  'household', '34000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001',
  'Campus Net', 'Campus Telecom', 'Home 500M', 'communication', 'active', 'keep', 30001,
  'monthly', '2026-01-31', '2026-01-31', '2026-09-30', '{CAMPUS NET}', '{7,1}'
);
insert into public.subscription_splits(subscription_id, member_id, share_basis_points)
values
  ('54000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 5000),
  ('54000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000002', 5000);
insert into public.subscription_price_history(
  id, subscription_id, effective_on, amount, note, created_by
) values (
  '64000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001',
  '2026-01-31', 30001, '최초 등록', auth.uid()
);
select pass('SUB-005 complete subscription record can be stored');

select is(public.materialize_subscription_occurrences('54000000-0000-0000-0000-000000000001', '2026-11-30'), 3, 'SUB-012 materializes actual billing occurrences');
select is(public.materialize_subscription_occurrences('54000000-0000-0000-0000-000000000001', '2026-11-30'), 0, 'SUB-012 repeated occurrence materialization is idempotent');
select is((select count(*)::integer from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001'), 3, 'SUB-012 occurrence count stays stable');
select is((select expected_amount from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'), 30001::bigint, 'SUB-011 initial effective price applies');

insert into public.financial_transactions(
  id, owner_id, account_id, direction, kind, amount, occurred_at, counterparty, descriptor, source
) values (
  '74000000-0000-0000-0000-000000000001', auth.uid(), '44000000-0000-0000-0000-000000000001',
  'outflow', 'expense', 30001, '2026-09-30 08:05+09', 'Campus Net', 'CAMPUS NET MONTHLY', 'mock_sync'
);
insert into public.match_suggestions(
  id, owner_id, transaction_id, target_kind, target_id, confidence, evidence
) values (
  '84000000-0000-0000-0000-000000000001', auth.uid(), '74000000-0000-0000-0000-000000000001',
  'subscription_occurrence',
  (select id from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'),
  0.95, '{"amount":"same","descriptor":"same","account":"same","timing":"same"}'
);
select is((select status::text from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'), 'scheduled', 'SUB-013 suggestion alone stays inert');
select lives_ok($$select public.confirm_subscription_match('84000000-0000-0000-0000-000000000001')$$, 'SUB-013 explicit confirmation matches expense');
select is((select status::text from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'), 'paid', 'SUB-013 confirmed occurrence becomes paid');
select ok(
  exists(
    select 1 from public.audit_events
    where entity_type = 'reconciliation_decision'
      and entity_id = '84000000-0000-0000-0000-000000000001'
      and household_id = '24000000-0000-0000-0000-000000000001'
      and actor_id = auth.uid()
      and before_data ->> 'status' = 'suggested'
      and after_data ->> 'linked_transaction_id' = '74000000-0000-0000-0000-000000000001'
  ),
  'SEC-012 subscription match audit retains household actor and prior/new linkage'
);
select is((select count(*)::integer from public.financial_transactions where id = '74000000-0000-0000-0000-000000000001'), 1, 'SUB-013 confirmation does not duplicate expense transaction');
select is((select count(*)::integer from public.shared_expenses where source_subscription_occurrence_id = (select id from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30')), 1, 'SUB-014 household paid occurrence creates exactly one shared expense');
select is((select sum(amount)::bigint from public.shared_expense_splits where shared_expense_id = (select shared_expense_id from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30')), 30001::bigint, 'SUB-009 split allocates every KRW');
select throws_ok(
  $$select public.confirm_subscription_match('84000000-0000-0000-0000-000000000001')$$,
  'P0001', 'subscription suggestion not found or already resolved',
  'SUB-014 repeated confirmation cannot create another shared expense'
);

select lives_ok($$select public.change_subscription_price('54000000-0000-0000-0000-000000000001', 33001, '2026-10-01', '할인 종료')$$, 'SUB-011 price change appends effective history');
select is((select count(*)::integer from public.subscription_price_history where subscription_id = '54000000-0000-0000-0000-000000000001'), 2, 'SUB-011 price history is append-only by effective date');
select is((select expected_amount from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-10-31'), 33001::bigint, 'SUB-011 future unpaid occurrence receives new price');
select is((select expected_amount from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'), 30001::bigint, 'SUB-011 paid historical occurrence keeps old price');
select throws_ok(
  $$update public.subscription_occurrences set expected_amount = 1
    where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'$$,
  'P0001', 'paid subscription occurrence history is immutable',
  'SUB-012 paid occurrence snapshot is immutable'
);

update public.subscriptions
set status = 'cancelled', cancelled_at = '2026-10-15 10:00+09'
where id = '54000000-0000-0000-0000-000000000001';
select is((select status::text from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-10-31'), 'skipped', 'SUB-019 cancellation stops future occurrences');
select is((select status::text from public.subscription_occurrences where subscription_id = '54000000-0000-0000-0000-000000000001' and due_on = '2026-09-30'), 'paid', 'SUB-019 cancellation preserves paid history');
select throws_ok(
  $$update public.subscriptions set status = 'active', cancelled_at = null
    where id = '54000000-0000-0000-0000-000000000001'$$,
  'P0001', 'terminal subscription status cannot be reactivated',
  'SUB-003 terminal status history cannot be reactivated'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"14000000-0000-0000-0000-000000000002","email":"subscription-roommate@example.com","role":"authenticated"}', true);
select results_eq('select name from public.subscriptions', array['Campus Net'::text], 'SUB-008 active roommate can read household subscription');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"14000000-0000-0000-0000-000000000003","email":"subscription-outsider@example.com","role":"authenticated"}', true);
select is_empty('select id from public.subscriptions', 'SUB-008 outsider cannot read subscription');
select is_empty('select id from public.subscription_occurrences', 'SUB-008 outsider cannot read subscription occurrences');

reset role;
select * from finish();
rollback;
