-- Route manual money entries without exposing account selection and allow safe metadata corrections.

create or replace function public.record_student_transaction(
  p_account_id uuid,
  p_kind public.transaction_kind,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_category_code text,
  p_counterparty text default null,
  p_descriptor text default null,
  p_memo text default null,
  p_student_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_account_id uuid := p_account_id;
  v_transaction_id uuid;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_kind not in ('income', 'expense') then
    raise exception 'only income or expense is allowed';
  end if;
  if p_student_id is not null and not exists (
    select 1 from public.students
     where id = p_student_id and owner_id = v_owner
  ) then
    raise exception 'student not found or forbidden' using errcode = '42501';
  end if;

  if v_account_id is null then
    select id into v_account_id
      from public.accounts
     where owner_id = v_owner and is_active
     order by
       case
         when p_kind = 'expense'
          and external_account_reference = 'rein-woori' then 0
         when p_kind = 'expense'
          and institution_name ilike '%우리%'
          and nickname ilike '%생활비%' then 1
         when p_kind = 'expense' and account_type = 'card' then 2
         when p_kind = 'income'
          and external_account_reference = 'rein-kb' then 0
         when p_kind = 'income'
          and institution_name ilike '%국민%'
          and nickname ilike '%모으%' then 1
         when p_kind = 'income' and account_type = 'savings' then 2
         when account_type in ('checking', 'cash') then 3
         else 9
       end,
       created_at,
       id
     limit 1;
  end if;

  v_transaction_id := public.record_manual_transaction(
    v_account_id,
    p_kind,
    p_amount,
    p_occurred_at,
    p_category_code,
    p_counterparty,
    p_descriptor,
    p_memo
  );

  if p_kind = 'income' and p_student_id is not null then
    update public.financial_transactions
       set student_id = p_student_id,
           updated_at = now()
     where id = v_transaction_id and owner_id = v_owner;
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.record_student_transaction(
  uuid, public.transaction_kind, bigint, timestamptz, text, text, text, text, uuid
) from public;
grant execute on function public.record_student_transaction(
  uuid, public.transaction_kind, bigint, timestamptz, text, text, text, text, uuid
) to authenticated;

create or replace function public.correct_financial_transaction(
  p_transaction_id uuid,
  p_category_code text,
  p_counterparty text default null,
  p_descriptor text default null,
  p_memo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_transaction public.financial_transactions%rowtype;
  v_category_id uuid;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_transaction
    from public.financial_transactions
   where id = p_transaction_id and owner_id = v_owner
   for update;
  if not found then
    raise exception 'transaction not found or forbidden' using errcode = '42501';
  end if;
  if v_transaction.kind = 'transfer' then
    raise exception 'transfer corrections are not allowed';
  end if;

  select id into v_category_id
    from public.transaction_categories
   where code = p_category_code
     and kind = v_transaction.kind::text::public.category_kind
     and is_active
     and (owner_id is null or owner_id = v_owner)
   order by (owner_id = v_owner) desc
   limit 1;
  if v_category_id is null then
    raise exception 'category not found';
  end if;

  update public.financial_transactions
     set category_id = v_category_id,
         counterparty = nullif(trim(p_counterparty), ''),
         descriptor = nullif(trim(p_descriptor), ''),
         memo = nullif(trim(p_memo), ''),
         updated_at = now()
   where id = v_transaction.id and owner_id = v_owner;

  return v_transaction.id;
end;
$$;

revoke all on function public.correct_financial_transaction(uuid, text, text, text, text)
  from public;
grant execute on function public.correct_financial_transaction(uuid, text, text, text, text)
  to authenticated;

create or replace function public.delete_manual_financial_transaction(
  p_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_transaction public.financial_transactions%rowtype;
  v_balance_delta bigint;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_transaction
    from public.financial_transactions
   where id = p_transaction_id and owner_id = v_owner
   for update;
  if not found then
    raise exception 'transaction not found or forbidden' using errcode = '42501';
  end if;
  if v_transaction.source <> 'manual' or v_transaction.kind = 'transfer' then
    raise exception 'only manual income or expense can be deleted' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.receivable_allocations where transaction_id = v_transaction.id
  ) or exists (
    select 1 from public.settlement_allocations where transaction_id = v_transaction.id
  ) then
    raise exception 'linked transaction cannot be deleted';
  end if;

  perform 1 from public.accounts
   where id = v_transaction.account_id and owner_id = v_owner
   for update;
  if not found then
    raise exception 'account not found or forbidden' using errcode = '42501';
  end if;

  v_balance_delta := case
    when v_transaction.direction = 'inflow' then v_transaction.amount
    else -v_transaction.amount
  end;

  delete from public.financial_transactions
   where id = v_transaction.id and owner_id = v_owner;

  update public.financial_transactions
     set balance_after = balance_after - v_balance_delta,
         updated_at = now()
   where owner_id = v_owner
     and account_id = v_transaction.account_id
     and balance_after is not null
     and (
       occurred_at > v_transaction.occurred_at
       or (occurred_at = v_transaction.occurred_at and created_at > v_transaction.created_at)
     );

  update public.accounts
     set current_balance = current_balance - v_balance_delta,
         available_balance = case
           when available_balance is null then null
           else available_balance - v_balance_delta
         end,
         balance_as_of = now(),
         updated_at = now()
   where id = v_transaction.account_id and owner_id = v_owner;

  return v_transaction.id;
end;
$$;

revoke all on function public.delete_manual_financial_transaction(uuid) from public;
grant execute on function public.delete_manual_financial_transaction(uuid) to authenticated;
