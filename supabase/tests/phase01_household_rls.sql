begin;

select plan(22);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', '', now(), '{}', '{"display_name":"최재원"}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'roommate@example.com', '', now(), '{}', '{"display_name":"룸메이트"}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.com', '', now(), '{}', '{"display_name":"외부인"}', now(), now());

insert into public.households(id, name, created_by)
values ('20000000-0000-0000-0000-000000000001', '관악 두 칸 집', '10000000-0000-0000-0000-000000000001');

insert into public.household_members(
  id, household_id, user_id, invitee_email, display_name, role, status, invited_by, joined_at
) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, '최재원', 'owner', 'active', null, now()),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', null, 'roommate@example.com', '룸메이트', 'member', 'invited', '10000000-0000-0000-0000-000000000001', null);

insert into public.external_connections(id, owner_id, kind, provider)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'bank', 'mock');

insert into public.accounts(id, owner_id, institution_name, nickname, account_type)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '목 데이터 은행', '생활비', 'checking');

insert into public.financial_transactions(
  id, owner_id, account_id, direction, kind, amount, occurred_at
) values (
  '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', 'outflow', 'expense', 12000, now()
);

insert into public.subscriptions(
  id, owner_id, scope, name, amount, billing_cycle, billing_anchor_on
) values (
  '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  'private', '개인 구독', 9900, 'monthly', current_date
);

insert into public.inventory_items(
  id, household_id, name, quantity, unit, storage_location, created_by
) values (
  '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '생수', 3, '병', 'room_temperature', '10000000-0000-0000-0000-000000000001'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is_empty('select id from public.profiles', 'SEC-001 unauthenticated profile access denied');
select is_empty('select id from public.households', 'SEC-001 unauthenticated household access denied');
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"owner@example.com","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into public.households(id, name, created_by)
    values ('20000000-0000-0000-0000-000000000099', '직접 생성 차단', auth.uid())$$,
  '42501',
  'new row violates row-level security policy for table "households"',
  'HOM-002 authenticated users must create households through the atomic RPC'
);
select is_empty(
  $$delete from public.household_members
    where id = '30000000-0000-0000-0000-000000000002'
    returning id$$,
  'HOM-002 owners cannot erase membership history with a direct delete'
);
select throws_ok(
  $$insert into public.household_members(
      household_id, user_id, display_name, role, status, joined_at
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003',
      '직접 추가 차단', 'member', 'active', now()
    )$$,
  '42501',
  'new row violates row-level security policy for table "household_members"',
  'HOM-002 owners cannot bypass invitation acceptance with a direct insert'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","email":"outsider@example.com","role":"authenticated"}',
  true
);
select is_empty('select id from public.accounts', 'SEC-002 outsider cannot read owner accounts');
select is_empty('select id from public.financial_transactions', 'SEC-002 outsider cannot read owner transactions');
select is_empty('select id from public.external_connections', 'SEC-002 outsider cannot read owner bank connections');
select is_empty('select id from public.subscriptions', 'SEC-002 outsider cannot read private subscriptions');
select is_empty('select id from public.households', 'HOM-001 nonmember cannot read household');
select is_empty('select id from public.inventory_items', 'HOM-001 nonmember cannot read shared rows');
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","email":"roommate@example.com","role":"authenticated"}',
  true
);
select results_eq(
  'select status::text from public.household_members where id = ''30000000-0000-0000-0000-000000000002''',
  array['invited'::text],
  'HOM-002 invitee can inspect only their pending invitation'
);
select lives_ok(
  $$select public.accept_household_invitation('30000000-0000-0000-0000-000000000002')$$,
  'HOM-002 matching invitee can accept invitation'
);
select results_eq(
  'select status::text from public.household_members where id = ''30000000-0000-0000-0000-000000000002''',
  array['active'::text],
  'HOM-002 accepted membership is active'
);
select results_eq(
  'select name from public.households',
  array['관악 두 칸 집'::text],
  'HOM-001 active roommate can read household'
);
select results_eq(
  'select name from public.inventory_items',
  array['생수'::text],
  'HOM-001 active roommate can read shared operations'
);
select is_empty('select id from public.accounts', 'SEC-002 roommate cannot read owner accounts');
select is_empty('select id from public.financial_transactions', 'SEC-002 roommate cannot read owner transactions');
select is_empty('select id from public.external_connections', 'SEC-002 roommate cannot read owner bank connections');
select is_empty('select id from public.subscriptions', 'SEC-002 roommate cannot read private subscriptions');
select lives_ok(
  $$select public.leave_household('20000000-0000-0000-0000-000000000001')$$,
  'HOM-002 active member can leave household'
);
select is_empty('select id from public.inventory_items', 'HOM-002 left member loses shared access');
reset role;

select * from finish();
rollback;
