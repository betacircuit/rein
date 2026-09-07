-- Student OS migration 0012: least-privilege external integration state,
-- retry-safe sync runs, redacted errors, and explicit Calendar ownership.

alter table public.external_connections
  add column last_attempt_at timestamptz,
  add column last_success_at timestamptz,
  add column revoked_at timestamptz;

alter table public.external_connections
  add constraint external_connections_provider_by_kind check (
    (kind = 'google_calendar' and provider in ('mock', 'google'))
    or (kind = 'bank' and provider in ('mock', 'manual_csv', 'kftc_testbed'))
  ),
  add constraint external_connections_production_kftc_disabled check (
    provider <> 'kftc_production'
  ),
  add constraint external_connections_least_privilege_scopes check (
    (kind = 'google_calendar' and scopes <@ array['https://www.googleapis.com/auth/calendar.events']::text[])
    or (kind = 'bank' and scopes <@ array['account_discovery','balance_inquiry','transaction_history']::text[])
  ),
  add constraint external_connections_secret_reference_only check (
    secret_reference is null
    or (
      secret_reference ~ '^(vault|kms|secret-manager)://[A-Za-z0-9/_-]+$'
      and secret_reference !~* '(access_token|refresh_token|client_secret|fintech_use_num|bearer)'
    )
  ),
  add constraint external_connections_revoked_shape check (
    status <> 'revoked' or (secret_reference is null and revoked_at is not null)
  ),
  add constraint external_connections_freshness_order check (
    last_success_at is null or last_attempt_at is null or last_success_at <= last_attempt_at
  );

alter table public.sync_runs
  add column idempotency_key text,
  add constraint sync_runs_idempotency_key_present check (
    idempotency_key is null or nullif(trim(idempotency_key), '') is not null
  ),
  add constraint sync_runs_terminal_shape check (
    (status = 'running' and finished_at is null)
    or (status <> 'running' and finished_at is not null)
  );
create unique index sync_runs_idempotency_unique
  on public.sync_runs(owner_id, connection_id, idempotency_key)
  where idempotency_key is not null;

alter table public.lessons
  add column calendar_connection_id uuid references public.external_connections(id) on delete set null,
  add column calendar_conference_request_id text,
  add column calendar_event_ownership text;
update public.lessons
set calendar_event_ownership = 'app_created'
where google_calendar_event_id is not null;
alter table public.lessons
  add constraint lessons_calendar_event_ownership check (
    calendar_event_ownership is null or calendar_event_ownership in ('app_created', 'explicitly_linked')
  ),
  add constraint lessons_calendar_external_shape check (
    (google_calendar_event_id is null and google_calendar_html_url is null
      and calendar_conference_request_id is null and calendar_event_ownership is null)
    or (google_calendar_event_id is not null and google_calendar_html_url is not null
      and calendar_event_ownership is not null)
  );
create unique index lessons_calendar_event_unique
  on public.lessons(owner_id, google_calendar_event_id)
  where google_calendar_event_id is not null;
create unique index lessons_calendar_conference_request_unique
  on public.lessons(owner_id, calendar_conference_request_id)
  where calendar_conference_request_id is not null;

create or replace function public.redact_integration_error(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(p_value, ''), 'Bearer[[:space:]]+[A-Za-z0-9._~-]+', 'Bearer [REDACTED]', 'gi'),
      '(access_token|refresh_token|client_secret|fintech_use_num)=([^&[:space:]]+)',
      '\1=[REDACTED]', 'gi'
    ),
    '(^|[^0-9])([0-9]{10,16})([^0-9]|$)', '\1[REDACTED_NUMBER]\3', 'g'
  );
$$;

create or replace function public.validate_integration_relation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'sync_runs' then
    if not exists(
      select 1 from public.external_connections ec
      where ec.id = new.connection_id and ec.owner_id = new.owner_id
    ) then raise exception 'sync connection owner mismatch'; end if;
  elsif tg_table_name = 'lessons' and new.calendar_connection_id is not null then
    if not exists(
      select 1 from public.external_connections ec
      where ec.id = new.calendar_connection_id
        and ec.owner_id = new.owner_id
        and ec.kind = 'google_calendar'
    ) then raise exception 'calendar connection owner mismatch'; end if;
  end if;
  return new;
end;
$$;
create trigger validate_sync_run_connection
before insert or update of owner_id, connection_id on public.sync_runs
for each row execute function public.validate_integration_relation();
create trigger validate_lesson_calendar_connection
before insert or update of owner_id, calendar_connection_id on public.lessons
for each row execute function public.validate_integration_relation();

drop policy if exists external_connections_owner_all on public.external_connections;
drop policy if exists sync_runs_owner_all on public.sync_runs;
create policy external_connections_owner_select
  on public.external_connections for select using (owner_id = auth.uid());
create policy sync_runs_owner_select
  on public.sync_runs for select using (owner_id = auth.uid());
revoke insert, update, delete on public.external_connections from authenticated;
revoke insert, update, delete on public.sync_runs from authenticated;

create or replace function public.connect_mock_integration(p_kind public.connection_kind)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid;
  v_scopes text[];
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  v_scopes := case when p_kind = 'google_calendar'
    then array['https://www.googleapis.com/auth/calendar.events']::text[]
    else array['account_discovery','balance_inquiry','transaction_history']::text[] end;
  insert into public.external_connections(
    owner_id, kind, provider, status, scopes, secret_reference,
    last_connected_at, last_attempt_at, last_success_at, revoked_at,
    last_error_code, last_error_message
  ) values (
    v_owner, p_kind, 'mock', 'connected', v_scopes, null,
    now(), now(), now(), null, null, null
  )
  on conflict (owner_id, kind, provider) do update set
    status = 'connected', scopes = excluded.scopes, secret_reference = null,
    last_connected_at = now(), last_attempt_at = now(), last_success_at = now(),
    revoked_at = null, last_error_code = null, last_error_message = null
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.begin_integration_sync(
  p_connection_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid;
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'idempotency key required'; end if;
  if not exists(
    select 1 from public.external_connections
    where id = p_connection_id and owner_id = v_owner and status = 'connected'
  ) then raise exception 'connected integration not found or forbidden'; end if;

  select id into v_id from public.sync_runs
  where owner_id = v_owner and connection_id = p_connection_id
    and idempotency_key = p_idempotency_key;
  if v_id is not null then return v_id; end if;

  insert into public.sync_runs(owner_id, connection_id, status, idempotency_key)
  values (v_owner, p_connection_id, 'running', p_idempotency_key)
  returning id into v_id;
  update public.external_connections
  set last_attempt_at = now(), last_error_code = null, last_error_message = null
  where id = p_connection_id and owner_id = v_owner;
  return v_id;
end;
$$;

create or replace function public.complete_integration_sync(
  p_run_id uuid,
  p_status public.sync_status,
  p_cursor_after text default null,
  p_imported_count integer default 0,
  p_skipped_count integer default 0,
  p_error_code text default null,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_connection_id uuid;
  v_redacted text := public.redact_integration_error(p_error_message);
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  if p_status = 'running' then raise exception 'terminal sync status required'; end if;
  if p_imported_count < 0 or p_skipped_count < 0 then raise exception 'invalid sync counts'; end if;
  select connection_id into v_connection_id from public.sync_runs
  where id = p_run_id and owner_id = v_owner and status = 'running'
  for update;
  if v_connection_id is null then raise exception 'running sync not found or forbidden'; end if;

  update public.sync_runs set
    status = p_status, finished_at = now(), cursor_after = p_cursor_after,
    imported_count = p_imported_count, skipped_count = p_skipped_count,
    error_code = p_error_code,
    redacted_error = case when p_status = 'failed' then nullif(v_redacted, '') else null end
  where id = p_run_id and owner_id = v_owner;
  update public.external_connections set
    status = case when p_status = 'failed' then 'error'::public.connection_status else 'connected'::public.connection_status end,
    last_success_at = case when p_status in ('succeeded','partial') then now() else last_success_at end,
    last_error_code = case when p_status = 'failed' then p_error_code else null end,
    last_error_message = case when p_status = 'failed' then nullif(v_redacted, '') else null end
  where id = v_connection_id and owner_id = v_owner;
end;
$$;

create or replace function public.disconnect_integration(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  update public.external_connections set
    status = 'revoked', scopes = '{}', external_subject = null, secret_reference = null,
    revoked_at = now(), last_attempt_at = now(),
    last_error_code = null, last_error_message = null
  where id = p_connection_id and owner_id = v_owner;
  if not found then raise exception 'integration not found or forbidden'; end if;
end;
$$;

revoke all on function public.connect_mock_integration(public.connection_kind) from public;
revoke all on function public.begin_integration_sync(uuid, text) from public;
revoke all on function public.complete_integration_sync(uuid, public.sync_status, text, integer, integer, text, text) from public;
revoke all on function public.disconnect_integration(uuid) from public;
grant execute on function public.connect_mock_integration(public.connection_kind) to authenticated;
grant execute on function public.begin_integration_sync(uuid, text) to authenticated;
grant execute on function public.complete_integration_sync(uuid, public.sync_status, text, integer, integer, text, text) to authenticated;
grant execute on function public.disconnect_integration(uuid) to authenticated;
