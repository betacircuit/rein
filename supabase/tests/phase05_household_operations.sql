begin;

select plan(31);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'household-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('15000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'household-roommate@example.com', '', now(), '{}', '{}', now(), now()),
  ('15000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'household-outsider@example.com', '', now(), '{}', '{}', now(), now());

insert into public.households(id, name, created_by) values
  ('25000000-0000-0000-0000-000000000001', '운영 테스트 집', '15000000-0000-0000-0000-000000000001'),
  ('25000000-0000-0000-0000-000000000002', '다른 집', '15000000-0000-0000-0000-000000000003');
insert into public.household_members(id, household_id, user_id, display_name, role, status, joined_at) values
  ('35000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', '나', 'owner', 'active', now()),
  ('35000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000002', '룸메이트', 'member', 'active', now()),
  ('35000000-0000-0000-0000-000000000003', '25000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', '외부인', 'owner', 'active', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000001","email":"household-owner@example.com","role":"authenticated"}', true);

insert into public.inventory_items(
  id, household_id, name, quantity, unit, owner_kind, owner_member_id,
  storage_location, expires_on, low_stock_threshold, notes, created_by
) values
  ('45000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '닭가슴살', 2, '개', 'shared', null, 'refrigerated', current_date + 5, 2, '고정 점심용', auth.uid()),
  ('45000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000001', '몬스터 에너지 · 차갑게', 2, '캔', 'member', '35000000-0000-0000-0000-000000000001', 'refrigerated', null, 1, '바로 마실 만큼', auth.uid()),
  ('45000000-0000-0000-0000-000000000003', '25000000-0000-0000-0000-000000000001', '몬스터 에너지 · 여분', 6, '캔', 'member', '35000000-0000-0000-0000-000000000001', 'room_temperature', null, 2, '선반 여분', auth.uid());

select pass('HOM-004 complete inventory fields can be stored');
select is((select count(*)::integer from public.inventory_items where name = '닭가슴살'), 1, 'CTX-004 demo seed includes chicken breast');
select is((select count(*)::integer from public.inventory_items where name like '몬스터%' and storage_location = 'refrigerated'), 1, 'CTX-004 Monster includes refrigerated stock');
select is((select count(*)::integer from public.inventory_items where name like '몬스터%' and storage_location = 'room_temperature'), 1, 'CTX-004 Monster includes room-temperature stock');
select is((select count(*)::integer from public.inventory_items where name like '몬스터%'), 2, 'CTX-004 Monster is split into two source rows');
select is((select count(distinct storage_location)::integer from public.inventory_items where name like '몬스터%'), 2, 'HOM-006 Monster is not all refrigerated');

select throws_ok(
  $$insert into public.inventory_items(
      household_id, name, quantity, unit, owner_kind, owner_member_id,
      storage_location, created_by
    ) values (
      '25000000-0000-0000-0000-000000000001', '잘못된 소유', 1, '개', 'member',
      '35000000-0000-0000-0000-000000000003', 'frozen', auth.uid()
    )$$,
  'P0001', 'inventory owner member mismatch',
  'HOM-005 cross-household inventory owner is rejected'
);

select lives_ok(
  $$select public.adjust_inventory_quantity(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001', -1, 0, 'chicken-minus-1'
    )$$,
  'HOM-007 atomic inventory adjustment succeeds'
);
select is((select quantity from public.inventory_items where id = '45000000-0000-0000-0000-000000000001'), 1::numeric, 'HOM-007 quantity is adjusted exactly once');
select is((select quantity_version from public.inventory_items where id = '45000000-0000-0000-0000-000000000001'), 1::bigint, 'HOM-007 quantity version advances');
select is((select count(*)::integer from public.inventory_adjustments where inventory_item_id = '45000000-0000-0000-0000-000000000001'), 1, 'HOM-007 adjustment audit row is retained');
select results_eq(
  $$select quantity_before, quantity_after from public.inventory_adjustments where idempotency_key = 'chicken-minus-1'$$,
  $$values (2::numeric, 1::numeric)$$,
  'HOM-007 adjustment audit preserves before and after'
);
select throws_ok(
  $$select public.adjust_inventory_quantity(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000002', 1, 1, 'impersonated-roommate'
    )$$,
  'P0001', 'inventory actor must match current user',
  'SEC-002 inventory audit actor must match the authenticated member'
);
select throws_ok(
  $$select public.adjust_inventory_quantity(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001', 1, 0, 'stale-owner'
    )$$,
  'P0001', 'inventory version conflict',
  'HOM-007 stale concurrent adjustment cannot overwrite newer quantity'
);
select throws_ok(
  $$select public.adjust_inventory_quantity(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001', -2, 1, 'negative-chicken'
    )$$,
  'P0001', 'inventory quantity cannot become negative',
  'HOM-007 inventory cannot become negative under retry'
);
select lives_ok(
  $$select public.adjust_inventory_quantity(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001', -1, 0, 'chicken-minus-1'
    )$$,
  'HOM-007 repeated idempotency key is harmless'
);
select is((select quantity from public.inventory_items where id = '45000000-0000-0000-0000-000000000001'), 1::numeric, 'HOM-007 repeated request does not adjust twice');

select lives_ok(
  $$select public.ensure_low_stock_shopping_item(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001'
    )$$,
  'HOM-008 low-stock item creates a shopping item'
);
select lives_ok(
  $$select public.ensure_low_stock_shopping_item(
      '45000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001'
    )$$,
  'HOM-008 repeated low-stock action is idempotent'
);
select is((select count(*)::integer from public.shopping_items where inventory_item_id = '45000000-0000-0000-0000-000000000001' and status = 'needed'), 1, 'HOM-008 low-stock action does not create duplicate open shopping items');
select is((select inventory_item_id from public.shopping_items where name = '닭가슴살'), '45000000-0000-0000-0000-000000000001'::uuid, 'HOM-008 shopping item retains inventory source');

insert into public.shopping_items(
  id, household_id, requested_by_member_id, owner_kind, owner_member_id,
  name, desired_quantity, unit
) values (
  '55000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001',
  '35000000-0000-0000-0000-000000000001', 'member',
  '35000000-0000-0000-0000-000000000002', '룸메이트 우유', 1, '병'
);
select is((select owner_member_id from public.shopping_items where id = '55000000-0000-0000-0000-000000000001'), '35000000-0000-0000-0000-000000000002'::uuid, 'HOM-009 personal shopping ownership uses a member reference');

insert into public.accounts(id, owner_id, institution_name, nickname, account_type)
values ('65000000-0000-0000-0000-000000000001', auth.uid(), '테스트 은행', '생활비', 'checking');
insert into public.financial_transactions(
  id, owner_id, account_id, direction, kind, amount, occurred_at, source
) values (
  '75000000-0000-0000-0000-000000000001', auth.uid(),
  '65000000-0000-0000-0000-000000000001', 'outflow', 'expense', 5000, now(), 'manual'
);
insert into public.shared_expenses(
  id, household_id, created_by, payer_member_id, linked_transaction_id,
  category, description, amount, incurred_on
) values (
  '85000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001',
  auth.uid(), '35000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001', 'shared_grocery', '닭가슴살', 5000, current_date
);
update public.shopping_items
set status = 'purchased', purchased_transaction_id = '75000000-0000-0000-0000-000000000001',
    shared_expense_id = '85000000-0000-0000-0000-000000000001', purchased_at = now()
where inventory_item_id = '45000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.shopping_items where purchased_transaction_id = '75000000-0000-0000-0000-000000000001' and shared_expense_id = '85000000-0000-0000-0000-000000000001'), 1, 'HOM-009 purchased item links existing financial records without duplication');
select ok(not has_column_privilege('authenticated', 'public.inventory_items', 'quantity', 'UPDATE'), 'HOM-007 direct quantity updates are not granted');

insert into public.cleaning_tasks(
  id, household_id, title, area, assignee_member_id, recurrence,
  recurrence_interval_days, due_soon_days, next_due_on, notes, created_by
) values (
  '95000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001',
  '화장실 청소', '화장실', '35000000-0000-0000-0000-000000000001',
  'interval_days', 7, 2, (now() at time zone 'Asia/Seoul')::date, '배수구 포함', auth.uid()
);
select is((select derived_status from public.v_cleaning_task_status where id = '95000000-0000-0000-0000-000000000001'), 'due', 'HOM-011 a task due today is derived as due');
select lives_ok(
  $$select public.complete_cleaning_task(
      '95000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001', '배수구까지 완료', 'bathroom-complete-1'
    )$$,
  'HOM-012 cleaning completion records actor and time'
);
select is((select count(*)::integer from public.cleaning_completions where task_id = '95000000-0000-0000-0000-000000000001' and completed_by_member_id = '35000000-0000-0000-0000-000000000001' and completed_at is not null), 1, 'HOM-012 completion history retains actor and timestamp');
select is((select next_due_on from public.cleaning_tasks where id = '95000000-0000-0000-0000-000000000001'), (now() at time zone 'Asia/Seoul')::date + 7, 'HOM-010 completion deterministically advances next due date');
select lives_ok(
  $$select public.complete_cleaning_task(
      '95000000-0000-0000-0000-000000000001',
      '35000000-0000-0000-0000-000000000001', '배수구까지 완료', 'bathroom-complete-1'
    )$$,
  'HOM-012 repeated completion request is idempotent'
);
select is((select count(*)::integer from public.cleaning_completions where task_id = '95000000-0000-0000-0000-000000000001'), 1, 'HOM-012 repeated completion does not duplicate history');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000002","email":"household-roommate@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.inventory_items) +
  (select count(*) from public.shopping_items) +
  (select count(*) from public.cleaning_tasks) +
  (select count(*) from public.cleaning_completions),
  7::bigint,
  'SEC-002 active roommate sees shared inventory shopping cleaning and completion rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-0000-0000-000000000003","email":"household-outsider@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.inventory_items) +
  (select count(*) from public.shopping_items) +
  (select count(*) from public.cleaning_tasks) +
  (select count(*) from public.cleaning_completions) +
  (select count(*) from public.inventory_adjustments),
  0::bigint,
  'SEC-002 outsider cannot read household operational rows'
);

reset role;
select * from finish();
rollback;
