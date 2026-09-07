-- REIN: detailed tutoring CRM fields and an atomic manual money entry point.

alter table public.students
  add column school_name text,
  add column school_level text,
  add column grade text,
  add column student_phone text,
  add column guardian_name text,
  add column guardian_phone text,
  add column guardian_relation text,
  add column source_channel text,
  add column consultation_status text not null default 'consulting',
  add column first_consulted_on date,
  add column started_on date,
  add column target_school text,
  add column target_major text,
  add column current_level text,
  add column target_level text,
  add column learning_goal text,
  add column curriculum_plan text,
  add column materials text,
  add column strengths text,
  add column weaknesses text,
  add column homework_policy text,
  add column progress_summary text,
  add column next_goal text;

alter table public.students
  add constraint students_consultation_status_allowed check (
    consultation_status in ('consulting', 'active', 'paused', 'ended')
  ),
  add constraint students_student_phone_length check (
    student_phone is null or length(student_phone) <= 30
  ),
  add constraint students_guardian_phone_length check (
    guardian_phone is null or length(guardian_phone) <= 30
  );

create or replace function public.record_manual_transaction(
  p_account_id uuid,
  p_kind public.transaction_kind,
  p_amount bigint,
  p_occurred_at timestamptz,
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
  v_account public.accounts%rowtype;
  v_category_id uuid;
  v_transaction_id uuid;
  v_direction public.transaction_direction;
  v_balance_after bigint;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_kind not in ('income', 'expense') then
    raise exception 'only income or expense is allowed';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if p_occurred_at is null then
    raise exception 'occurred_at is required';
  end if;

  if p_account_id is null then
    select * into v_account
      from public.accounts
     where owner_id = v_owner and is_active
     order by created_at
     limit 1
     for update;

    if not found then
      insert into public.accounts(
        owner_id, institution_name, nickname, account_type, provider,
        currency, current_balance, available_balance, balance_as_of,
        included_in_totals
      ) values (
        v_owner, 'REIN', '기본 현금 장부', 'cash', 'mock',
        'KRW', 0, 0, now(), true
      ) returning * into v_account;
    end if;
  else
    select * into v_account
      from public.accounts
     where id = p_account_id and owner_id = v_owner and is_active
     for update;
    if not found then
      raise exception 'account not found or forbidden' using errcode = '42501';
    end if;
  end if;

  select id into v_category_id
    from public.transaction_categories
   where code = p_category_code
     and kind = p_kind::text::public.category_kind
     and is_active
     and (owner_id is null or owner_id = v_owner)
   order by (owner_id = v_owner) desc
   limit 1;
  if v_category_id is null then
    raise exception 'category not found';
  end if;

  v_direction := case when p_kind = 'income' then 'inflow' else 'outflow' end;
  v_balance_after := v_account.current_balance
    + case when v_direction = 'inflow' then p_amount else -p_amount end;

  insert into public.financial_transactions(
    owner_id, account_id, category_id, scope, direction, kind, amount,
    currency, occurred_at, counterparty, descriptor, memo, balance_after, source
  ) values (
    v_owner, v_account.id, v_category_id, 'private', v_direction, p_kind,
    p_amount, 'KRW', p_occurred_at, nullif(trim(p_counterparty), ''),
    nullif(trim(p_descriptor), ''), nullif(trim(p_memo), ''),
    v_balance_after, 'manual'
  ) returning id into v_transaction_id;

  update public.accounts
     set current_balance = v_balance_after,
         available_balance = v_balance_after,
         balance_as_of = now(),
         updated_at = now()
   where id = v_account.id;

  return v_transaction_id;
end;
$$;

revoke all on function public.record_manual_transaction(
  uuid, public.transaction_kind, bigint, timestamptz, text, text, text, text
) from public;
grant execute on function public.record_manual_transaction(
  uuid, public.transaction_kind, bigint, timestamptz, text, text, text, text
) to authenticated;
