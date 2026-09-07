begin;

select plan(37);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shared-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('16000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shared-roommate@example.com', '', now(), '{}', '{}', now(), now()),
  ('16000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shared-outsider@example.com', '', now(), '{}', '{}', now(), now());

insert into public.households(id, name, created_by) values
  ('26000000-0000-0000-0000-000000000001', 'shared home', '16000000-0000-0000-0000-000000000001'),
  ('26000000-0000-0000-0000-000000000002', 'outsider home', '16000000-0000-0000-0000-000000000003');
insert into public.household_members(id, household_id, user_id, display_name, role, status, joined_at) values
  ('36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'owner', 'owner', 'active', now()),
  ('36000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'roommate', 'member', 'active', now()),
  ('36000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', 'outsider', 'owner', 'active', now());

insert into public.accounts(id, owner_id, institution_name, nickname, account_type, current_balance) values
  ('46000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'mock bank', 'living', 'checking', 1000000);
insert into public.financial_transactions(
  id, owner_id, account_id, scope, direction, kind, amount, occurred_at, counterparty, descriptor, source
) values
  ('56000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'private', 'outflow', 'expense', 700000, '2026-09-01T09:00:00+09:00', 'landlord', 'September rent', 'mock_sync'),
  ('56000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'private', 'inflow', 'income', 200000, '2026-09-03T10:00:00+09:00', 'roommate', 'rent settlement', 'mock_sync'),
  ('56000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'private', 'outflow', 'expense', 54321, '2026-09-03T08:00:00+09:00', 'utility', 'electricity', 'mock_sync'),
  ('56000000-0000-0000-0000-000000000004', '16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'private', 'outflow', 'expense', 12000, '2026-09-03T12:00:00+09:00', 'cafeteria', 'lunch', 'mock_sync');
insert into public.settlements(
  id, household_id, from_member_id, to_member_id, period_start, period_end, amount_due, amount_paid, status
) values (
  '66000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000001',
  '2026-09-01', '2026-09-30', 310000, 0, 'open'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"16000000-0000-0000-0000-000000000001","email":"shared-owner@example.com","role":"authenticated"}', true);

select is(
  (select count(*)::integer from unnest(enum_range(null::public.shared_expense_category))),
  10,
  'HOM-013 all agreed categories are available'
);
select lives_ok(
  $$select public.upsert_shared_expense(
    '76000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000001', 'rent', 'charge', 'September rent', 700000,
    '2026-09-01', '2026-09-01', '56000000-0000-0000-0000-000000000001', null,
    '[{"member_id":"36000000-0000-0000-0000-000000000001","amount":350000},{"member_id":"36000000-0000-0000-0000-000000000002","amount":350000}]'::jsonb
  )$$,
  'MON-016 actual rent outflow creates one shared source row'
);
select is((select sum(amount) from public.shared_expense_splits where shared_expense_id = '76000000-0000-0000-0000-000000000001'), 700000::bigint, 'HOM-015 split allocates every KRW');
select is((select payer_member_id from public.shared_expenses where id = '76000000-0000-0000-0000-000000000001'), '36000000-0000-0000-0000-000000000001'::uuid, 'HOM-014 actual payer is stored separately');
select is((select amount from public.shared_expense_splits where shared_expense_id = '76000000-0000-0000-0000-000000000001' and member_id = '36000000-0000-0000-0000-000000000001'), 350000::bigint, 'MON-016 payer economic burden is only half');
select is((select net_credit_before_settlement from public.v_household_member_balances where member_id = '36000000-0000-0000-0000-000000000001'), 350000::bigint, 'MON-016 roommate owes the prepaid half');

select lives_ok(
  $$select public.upsert_shared_expense(
    '76000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000002', 'electricity', 'charge', 'electricity', 100000,
    '2026-09-02', null, null, null,
    '[{"member_id":"36000000-0000-0000-0000-000000000001","amount":50000},{"member_id":"36000000-0000-0000-0000-000000000002","amount":50000}]'::jsonb
  )$$,
  'HOM-016 payer reversal is accepted independently of splits'
);
select lives_ok(
  $$select public.upsert_shared_expense(
    '76000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000002', 'electricity', 'refund', 'electricity refund', 20000,
    '2026-09-03', null, null, null,
    '[{"member_id":"36000000-0000-0000-0000-000000000001","amount":10000},{"member_id":"36000000-0000-0000-0000-000000000002","amount":10000}]'::jsonb
  )$$,
  'HOM-016 refund reverses payer and responsibility signs'
);
select is((select net_credit_before_settlement from public.v_household_member_balances where member_id = '36000000-0000-0000-0000-000000000001'), 310000::bigint, 'HOM-016 payer reversals and refunds net to one pairwise balance');

select is(public.refresh_settlement_suggestions('66000000-0000-0000-0000-000000000001'), 1, 'HOM-017 bank deposit becomes a settlement suggestion');
select is((select amount_paid from public.settlements where id = '66000000-0000-0000-0000-000000000001'), 0::bigint, 'HOM-017 suggestion alone stays inert');
select lives_ok(
  $$select public.confirm_settlement_match(
    (select id from public.match_suggestions where transaction_id = '56000000-0000-0000-0000-000000000002' and target_kind = 'settlement'),
    200000
  )$$,
  'HOM-017 explicit settlement confirmation succeeds'
);
select ok(
  exists(
    select 1 from public.audit_events
    where entity_type = 'reconciliation_decision'
      and entity_id = (
        select id from public.match_suggestions
        where transaction_id = '56000000-0000-0000-0000-000000000002'
          and target_kind = 'settlement'
      )
      and household_id = '26000000-0000-0000-0000-000000000001'
      and actor_id = auth.uid()
      and before_data ->> 'status' = 'suggested'
      and after_data ->> 'linked_transaction_id' = '56000000-0000-0000-0000-000000000002'
      and metadata ->> 'source' = 'match_suggestion'
  ),
  'SEC-012 settlement match audit retains household actor source and prior/new linkage'
);
select is((select amount_paid from public.settlements where id = '66000000-0000-0000-0000-000000000001'), 200000::bigint, 'HOM-017 partial settlement records paid amount');
select is((select status::text from public.settlements where id = '66000000-0000-0000-0000-000000000001'), 'partially_paid', 'HOM-017 partial settlement updates status');
select is((select transaction_id from public.settlement_allocations where settlement_id = '66000000-0000-0000-0000-000000000001'), '56000000-0000-0000-0000-000000000002'::uuid, 'HOM-017 confirmed allocation retains transaction traceability');
select is((select net_credit_after_settlement from public.v_household_member_balances where member_id = '36000000-0000-0000-0000-000000000001'), 110000::bigint, 'HOM-016 partial settlement reduces net balance correctly');
select is((select count(*)::integer from public.shared_expenses), 3, 'HOM-016 historical expenses are not rewritten by settlement');
select throws_ok(
  $$select public.confirm_settlement_match(
    (select id from public.match_suggestions where transaction_id = '56000000-0000-0000-0000-000000000002' and target_kind = 'settlement'),
    100000
  )$$,
  'P0001', 'settlement suggestion not found or already resolved',
  'HOM-017 repeated confirmation cannot double allocate a transaction'
);
select is((select scope::text from public.financial_transactions where id = '56000000-0000-0000-0000-000000000002'), 'household', 'MON-016 confirmed settlement keeps actual cash movement linked');
select throws_ok(
  $$select public.upsert_shared_expense(
    '76000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000001', 'rent', 'charge', 'rewritten rent', 700000,
    '2026-09-01', '2026-09-01', '56000000-0000-0000-0000-000000000001', null,
    '[{"member_id":"36000000-0000-0000-0000-000000000001","amount":350000},{"member_id":"36000000-0000-0000-0000-000000000002","amount":350000}]'::jsonb
  )$$,
  'P0001', 'settled expense history is immutable',
  'HOM-014 an allocated settlement locks expense history'
);

select throws_ok(
  $$select public.upsert_shared_expense(
    '76000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000001', 'other', 'charge', 'bad split', 100,
    '2026-09-03', null, null, null,
    '[{"member_id":"36000000-0000-0000-0000-000000000001","amount":49},{"member_id":"36000000-0000-0000-0000-000000000002","amount":50}]'::jsonb
  )$$,
  'P0001', 'shared expense split must allocate every KRW',
  'HOM-015 invalid split total is rejected'
);
select is((select count(*)::integer from public.shared_expenses where linked_transaction_id = '56000000-0000-0000-0000-000000000003'), 0, 'HOM-019 classification candidate stays inert before confirmation');
select lives_ok(
  $$select public.confirm_household_transaction_classification(
    '56000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000002', 'utility', '76000000-0000-0000-0000-000000000005'
  )$$,
  'HOM-019 explicit utility classification succeeds'
);
select is((select count(*)::integer from public.shared_expenses where linked_transaction_id = '56000000-0000-0000-0000-000000000003'), 1, 'HOM-019 confirmation creates exactly one linked shared expense');
select is((select sum(amount) from public.shared_expense_splits where shared_expense_id = '76000000-0000-0000-0000-000000000005'), 54321::bigint, 'HOM-015 odd transaction split assigns every KRW');
select throws_ok(
  $$select public.confirm_household_transaction_classification(
    '56000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000002', 'personal', '76000000-0000-0000-0000-000000000006'
  )$$,
  'P0001', 'transaction is already linked to a shared expense',
  'HOM-019 a linked transaction cannot be reclassified into a double-counting state'
);
select lives_ok(
  $$select public.confirm_household_transaction_classification(
    '56000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000002', 'personal', '76000000-0000-0000-0000-000000000006'
  )$$,
  'HOM-019 personal classification is explicitly confirmable'
);
select is((select count(*)::integer from public.shared_expenses where linked_transaction_id = '56000000-0000-0000-0000-000000000004'), 0, 'HOM-019 personal confirmation does not create a shared expense');

select is((select household_responsibility from public.responsibility_adjusted_money('16000000-0000-0000-0000-000000000001', '2026-09-01')), 417161::bigint, 'HOM-018 responsibility projection counts each shared source once');
select is((select settled_income_excluding_settlements from public.responsibility_adjusted_money('16000000-0000-0000-0000-000000000001', '2026-09-01')), 0::bigint, 'HOM-018 settlement deposit is excluded from ordinary settled income');
select is((select confirmed_reimbursements from public.responsibility_adjusted_money('16000000-0000-0000-0000-000000000001', '2026-09-01')), 200000::bigint, 'HOM-018 confirmed reimbursement is added exactly once');

select set_config('request.jwt.claims', '{"sub":"16000000-0000-0000-0000-000000000002","email":"shared-roommate@example.com","role":"authenticated"}', true);
select is((select count(*)::integer from public.shared_expenses), 4, 'SEC-002 active roommate sees shared expense facts');
select is((select count(*)::integer from public.settlement_allocations), 0, 'SEC-002 roommate cannot read owner-private settlement transaction allocation');
select is((select count(*)::integer from public.financial_transactions), 0, 'SEC-002 private account and counterparty details do not leak to roommate projections');

select set_config('request.jwt.claims', '{"sub":"16000000-0000-0000-0000-000000000003","email":"shared-outsider@example.com","role":"authenticated"}', true);
select is((select count(*)::integer from public.shared_expenses), 0, 'SEC-002 outsider cannot read household shared expenses');
select throws_ok(
  $$select public.upsert_shared_expense(
    '76000000-0000-0000-0000-000000000007', '26000000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000001', 'other', 'charge', 'outsider write', 100,
    '2026-09-03', null, null, null,
    '[{"member_id":"36000000-0000-0000-0000-000000000001","amount":50},{"member_id":"36000000-0000-0000-0000-000000000002","amount":50}]'::jsonb
  )$$,
  'P0001', 'shared expense actor must be an active household member',
  'SEC-002 outsider cannot mutate shared expense through RPC'
);

select * from finish();
rollback;
