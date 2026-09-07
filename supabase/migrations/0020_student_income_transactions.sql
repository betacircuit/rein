-- Link manual tutoring income to a student while preserving the authenticated owner boundary.
alter table public.financial_transactions
  add column if not exists student_id uuid references public.students(id) on delete set null;

create index if not exists financial_transactions_owner_student_idx
  on public.financial_transactions(owner_id, student_id, occurred_at desc)
  where student_id is not null;

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
  v_transaction_id uuid;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_student_id is not null and not exists (
    select 1 from public.students
     where id = p_student_id and owner_id = v_owner
  ) then
    raise exception 'student not found or forbidden' using errcode = '42501';
  end if;

  v_transaction_id := public.record_manual_transaction(
    p_account_id,
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
