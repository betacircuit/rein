-- Student OS migration 0007: Phase 03 money ledger and receivable boundaries

alter table public.accounts
  add column included_in_totals boolean not null default true;

alter table public.accounts
  add constraint accounts_institution_name_nonblank check (nullif(trim(institution_name), '') is not null),
  add constraint accounts_nickname_nonblank check (nullif(trim(nickname), '') is not null),
  add constraint accounts_currency_krw check (currency = 'KRW'),
  add constraint accounts_masked_number_shape check (
    masked_account_number is null or masked_account_number ~ '[•*xX]'
  );

-- A transaction may back each downstream payment concept at most once.
create unique index shared_expenses_linked_transaction_unique
  on public.shared_expenses(linked_transaction_id)
  where linked_transaction_id is not null;
create unique index settlements_matched_transaction_unique
  on public.settlements(matched_transaction_id)
  where matched_transaction_id is not null;
create unique index subscription_occurrences_matched_transaction_unique
  on public.subscription_occurrences(matched_transaction_id)
  where matched_transaction_id is not null;

-- Lock both sides and reject owner, status, direction, receivable-total and
-- transaction-total violations. This replaces the Phase 00 draft validator.
create or replace function public.validate_receivable_allocation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_due bigint;
  v_tx_amount bigint;
  v_receivable_allocated bigint;
  v_transaction_allocated bigint;
  v_receivable_owner uuid;
  v_tx_owner uuid;
  v_receivable_status public.receivable_status;
  v_direction public.transaction_direction;
  v_kind public.transaction_kind;
begin
  select amount_due, owner_id, status
    into v_due, v_receivable_owner, v_receivable_status
  from public.receivables where id = new.receivable_id for update;
  if not found then raise exception 'receivable not found'; end if;

  select amount, owner_id, direction, kind
    into v_tx_amount, v_tx_owner, v_direction, v_kind
  from public.financial_transactions where id = new.transaction_id for update;
  if not found then raise exception 'transaction not found'; end if;

  if v_receivable_owner is distinct from v_tx_owner then raise exception 'allocation owner mismatch'; end if;
  if new.created_by is distinct from v_receivable_owner then raise exception 'allocation creator mismatch'; end if;
  if auth.uid() is not null and new.created_by is distinct from auth.uid() then raise exception 'allocation actor mismatch'; end if;
  if v_receivable_status = 'void' then raise exception 'void receivable cannot be allocated'; end if;
  if v_direction <> 'inflow' or v_kind <> 'income' then raise exception 'receivable requires income inflow'; end if;

  select coalesce(sum(amount), 0) into v_receivable_allocated
  from public.receivable_allocations
  where receivable_id = new.receivable_id and id is distinct from new.id;
  select coalesce(sum(amount), 0) into v_transaction_allocated
  from public.receivable_allocations
  where transaction_id = new.transaction_id and id is distinct from new.id;

  if v_receivable_allocated + new.amount > v_due then raise exception 'allocation exceeds amount due'; end if;
  if v_transaction_allocated + new.amount > v_tx_amount then raise exception 'allocation exceeds transaction amount'; end if;
  return new;
end;
$$;

-- Suggestions remain inert until this explicit confirmation function runs.
create or replace function public.confirm_receivable_match(p_suggestion_id uuid)
returns public.receivable_allocations
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_suggestion public.match_suggestions;
  v_receivable public.receivables;
  v_transaction public.financial_transactions;
  v_receivable_paid bigint;
  v_transaction_used bigint;
  v_amount bigint;
  v_allocation public.receivable_allocations;
begin
  select * into v_suggestion from public.match_suggestions
  where id = p_suggestion_id and owner_id = auth.uid() and status = 'suggested'
  for update;
  if not found then raise exception 'suggestion not found or already resolved'; end if;
  if v_suggestion.target_kind <> 'receivable' then raise exception 'suggestion target is not a receivable'; end if;

  select * into v_receivable from public.receivables
  where id = v_suggestion.target_id and owner_id = auth.uid() for update;
  select * into v_transaction from public.financial_transactions
  where id = v_suggestion.transaction_id and owner_id = auth.uid() for update;
  if v_receivable.id is null or v_transaction.id is null then raise exception 'match boundary mismatch'; end if;

  select coalesce(sum(amount), 0) into v_receivable_paid
  from public.receivable_allocations where receivable_id = v_receivable.id;
  select coalesce(sum(amount), 0) into v_transaction_used
  from public.receivable_allocations where transaction_id = v_transaction.id;
  v_amount := least(v_receivable.amount_due - v_receivable_paid, v_transaction.amount - v_transaction_used);
  if v_amount <= 0 then raise exception 'nothing remains to allocate'; end if;

  insert into public.receivable_allocations(receivable_id, transaction_id, amount, created_by)
  values (v_receivable.id, v_transaction.id, v_amount, auth.uid())
  on conflict (receivable_id, transaction_id) do nothing
  returning * into v_allocation;
  if v_allocation.id is null then raise exception 'match was already allocated'; end if;

  update public.match_suggestions
  set status = 'confirmed', confirmed_at = now(), updated_at = now()
  where id = v_suggestion.id;
  insert into public.audit_events(owner_id, actor_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), auth.uid(), 'confirm', 'match_suggestion', v_suggestion.id, to_jsonb(v_allocation));
  return v_allocation;
end;
$$;

create or replace function public.dismiss_match_suggestion(p_suggestion_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.match_suggestions
  set status = 'dismissed', dismissed_at = now(), updated_at = now()
  where id = p_suggestion_id and owner_id = auth.uid() and status = 'suggested';
  if not found then raise exception 'suggestion not found or already resolved'; end if;
end;
$$;

-- The client sends only rows that passed preview validation. The function still
-- revalidates ownership and values, and one SQL statement makes the batch atomic.
create or replace function public.import_financial_transactions_csv(
  p_account_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if not exists(select 1 from public.accounts where id = p_account_id and owner_id = auth.uid()) then
    raise exception 'account not found or forbidden';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'CSV batch must be an array of at most 1000 rows';
  end if;

  with parsed as (
    select
      row->>'fingerprint' as fingerprint,
      (row->>'occurred_at')::timestamptz as occurred_at,
      (row->>'direction')::public.transaction_direction as direction,
      (row->>'amount')::bigint as amount,
      nullif(trim(row->>'counterparty'), '') as counterparty,
      nullif(trim(row->>'descriptor'), '') as descriptor
    from jsonb_array_elements(p_rows) row
  ), validated as (
    select *, case when direction = 'inflow' then 'income'::public.transaction_kind else 'expense'::public.transaction_kind end as kind
    from parsed
    where fingerprint is not null and amount > 0 and direction in ('inflow', 'outflow')
  ), inserted as (
    insert into public.financial_transactions(
      owner_id, account_id, category_id, scope, direction, kind, amount,
      occurred_at, counterparty, descriptor, source, import_fingerprint
    )
    select auth.uid(), p_account_id, c.id, 'private', v.direction, v.kind, v.amount,
      v.occurred_at, v.counterparty, v.descriptor, 'manual_csv', v.fingerprint
    from validated v
    join public.transaction_categories c
      on c.owner_id is null and c.code = case when v.kind = 'income' then 'other_income' else 'other_expense' end
    on conflict (account_id, import_fingerprint) where import_fingerprint is not null do nothing
    returning 1
  ) select count(*) into v_inserted from inserted;

  if v_inserted < jsonb_array_length(p_rows) and exists (
    select 1 from jsonb_array_elements(p_rows) row
    where nullif(row->>'fingerprint', '') is null or (row->>'amount')::bigint <= 0
  ) then raise exception 'CSV batch contains invalid rows'; end if;
  return v_inserted;
end;
$$;

revoke all on function public.confirm_receivable_match(uuid) from public;
revoke all on function public.dismiss_match_suggestion(uuid) from public;
revoke all on function public.import_financial_transactions_csv(uuid, jsonb) from public;
grant execute on function public.confirm_receivable_match(uuid) to authenticated;
grant execute on function public.dismiss_match_suggestion(uuid) to authenticated;
grant execute on function public.import_financial_transactions_csv(uuid, jsonb) to authenticated;
