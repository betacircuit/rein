-- Student OS migration 0013: card account support, actor-bound deletion
-- requests, retention evidence, and append-only audit history.

alter type public.account_type add value if not exists 'card';

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  retention_until date not null default (current_date + 30),
  scope_snapshot jsonb not null default '{}'::jsonb,
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);
create unique index account_deletion_requests_one_open
  on public.account_deletion_requests(owner_id)
  where status in ('requested', 'processing');

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;
create policy account_deletion_requests_owner_select
  on public.account_deletion_requests for select using (owner_id = auth.uid());

revoke insert, update, delete on public.account_deletion_requests from authenticated;
revoke insert, update, delete on public.audit_events from authenticated;
grant select on public.account_deletion_requests to authenticated;

create or replace function public.request_account_deletion(p_confirmation text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_request_id uuid;
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  if p_confirmation <> '내 데이터 삭제' then raise exception 'deletion confirmation mismatch'; end if;

  insert into public.account_deletion_requests(owner_id, scope_snapshot)
  values (
    v_owner,
    jsonb_build_object(
      'private_records', true,
      'shared_history_policy', 'anonymize_actor_and_retain_settlement_facts',
      'credentials_revoked_before_completion', true
    )
  )
  on conflict (owner_id) where status in ('requested', 'processing')
  do update set requested_at = excluded.requested_at
  returning id into v_request_id;

  insert into public.audit_events(
    owner_id, actor_id, action, entity_type, entity_id, after_data, metadata
  ) values (
    v_owner, v_owner, 'delete', 'account_deletion_request', v_request_id,
    jsonb_build_object('status', 'requested'),
    jsonb_build_object('retention_until', current_date + 30)
  );
  return v_request_id;
end;
$$;

revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;
