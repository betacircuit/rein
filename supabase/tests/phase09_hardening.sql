begin;

select plan(13);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'privacy-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'privacy-outsider@example.com', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"19000000-0000-0000-0000-000000000001","email":"privacy-owner@example.com","role":"authenticated"}', true);

select ok('card' = any(enum_range(null::public.account_type)::text[]), 'MON-018 card account type is supported');
select ok(
  exists(
    select 1
    from pg_trigger
    where tgname = 'audit_confirmed_match_decision_trigger'
      and not tgisinternal
  ),
  'SEC-012 reconciliation confirmation audit trigger is installed'
);
select lives_ok(
  $$select public.request_account_deletion('내 데이터 삭제')$$,
  'SEC-008 owner can request deletion with explicit confirmation'
);
select is((select count(*)::integer from public.account_deletion_requests), 1, 'SEC-008 one open deletion request is retained');
select is((select status from public.account_deletion_requests), 'requested', 'SEC-008 deletion has an honest pending state');
select ok((select retention_until >= current_date + 30 from public.account_deletion_requests), 'SEC-008 retention date is explicit');
select is((select actor_id from public.audit_events where entity_type = 'account_deletion_request'), auth.uid(), 'SEC-012 deletion audit retains actor');
select is((select action::text from public.audit_events where entity_type = 'account_deletion_request'), 'delete', 'SEC-012 deletion audit retains decision type');
select throws_ok(
  $$select public.request_account_deletion('삭제')$$,
  'P0001', 'deletion confirmation mismatch',
  'UX-004 destructive action rejects an incomplete confirmation'
);
select throws_ok(
  $$insert into public.audit_events(owner_id, actor_id, action, entity_type) values (auth.uid(), auth.uid(), 'confirm', 'forged')$$,
  '42501', 'permission denied for table audit_events',
  'SEC-012 clients cannot forge audit history'
);
select lives_ok(
  $$select public.request_account_deletion('내 데이터 삭제')$$,
  'SEC-008 repeated deletion request is idempotent'
);

select set_config('request.jwt.claims', '{"sub":"19000000-0000-0000-0000-000000000002","email":"privacy-outsider@example.com","role":"authenticated"}', true);
select is_empty('select id from public.account_deletion_requests', 'SEC-002 outsider cannot read deletion requests');
select is_empty(
  $$select id from public.audit_events where entity_type = 'account_deletion_request'$$,
  'SEC-012 outsider cannot read private deletion audit'
);

select * from finish();
rollback;
