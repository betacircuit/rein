-- Student OS migration 0010: exact shared-expense splits, pairwise settlement,
-- owner-private transaction allocations, and explicit classification confirmation.

do $$ begin
  create type public.shared_expense_entry_kind as enum ('charge', 'refund');
exception when duplicate_object then null;
end $$;

alter table public.shared_expenses
  add column entry_kind public.shared_expense_entry_kind not null default 'charge';

create table public.settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null references public.financial_transactions(id) on delete restrict,
  amount bigint not null check (amount > 0),
  created_by_member_id uuid not null references public.household_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(transaction_id)
);
create index settlement_allocations_settlement_idx
  on public.settlement_allocations(settlement_id, created_at);

alter table public.settlement_allocations enable row level security;
alter table public.settlement_allocations force row level security;
create policy settlement_allocations_owner_select
  on public.settlement_allocations for select
  using (owner_id = auth.uid());

-- Shared facts remain readable to active members, but all financial mutations use
-- actor-bound RPCs. The private settlement allocation is owner-only.
drop policy if exists shared_expenses_member_all on public.shared_expenses;
drop policy if exists shared_expense_splits_member_all on public.shared_expense_splits;
drop policy if exists settlements_member_all on public.settlements;
create policy shared_expenses_member_select on public.shared_expenses for select
  using (public.is_household_member(household_id));
create policy shared_expense_splits_member_select on public.shared_expense_splits for select
  using (exists(
    select 1 from public.shared_expenses se
    where se.id = shared_expense_id and public.is_household_member(se.household_id)
  ));
create policy settlements_member_select on public.settlements for select
  using (public.is_household_member(household_id));

revoke insert, update, delete on public.shared_expenses from authenticated;
revoke insert, update, delete on public.shared_expense_splits from authenticated;
revoke insert, update, delete on public.settlements from authenticated;
revoke insert, update, delete on public.settlement_allocations from authenticated;

create or replace function public.validate_shared_expense_split_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from public.shared_expenses where id = new.shared_expense_id;
  if not public.member_belongs_to_household(new.member_id, v_household_id) then
    raise exception 'shared expense split member mismatch';
  end if;
  return new;
end;
$$;
create trigger validate_shared_expense_split_member_before_write
before insert or update on public.shared_expense_splits
for each row execute function public.validate_shared_expense_split_member();

create or replace function public.validate_shared_expense_amount_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_total bigint;
begin
  select coalesce(sum(amount), 0)::bigint into v_total
  from public.shared_expense_splits where shared_expense_id = new.id;
  if v_total <> new.amount then
    raise exception 'shared expense split must allocate every KRW: expected %, got %', new.amount, v_total;
  end if;
  return null;
end;
$$;
create constraint trigger shared_expense_amount_total_check
after update of amount on public.shared_expenses
deferrable initially deferred
for each row execute function public.validate_shared_expense_amount_total();

create or replace function public.upsert_shared_expense(
  p_expense_id uuid,
  p_household_id uuid,
  p_payer_member_id uuid,
  p_category public.shared_expense_category,
  p_entry_kind public.shared_expense_entry_kind,
  p_description text,
  p_amount bigint,
  p_incurred_on date,
  p_due_on date,
  p_linked_transaction_id uuid,
  p_notes text,
  p_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_member_id uuid;
  v_existing public.shared_expenses;
  v_transaction public.financial_transactions;
  v_split_count integer;
  v_split_total bigint;
  v_expense_id uuid := coalesce(p_expense_id, gen_random_uuid());
begin
  if p_amount <= 0 then raise exception 'shared expense amount must be positive'; end if;
  if nullif(btrim(p_description), '') is null then raise exception 'shared expense description is required'; end if;
  select id into v_actor_member_id from public.household_members
  where household_id = p_household_id and user_id = auth.uid() and status = 'active';
  if v_actor_member_id is null then raise exception 'shared expense actor must be an active household member'; end if;
  if not public.member_belongs_to_household(p_payer_member_id, p_household_id) then
    raise exception 'shared expense payer mismatch';
  end if;

  select count(*)::integer, coalesce(sum(x.amount), 0)::bigint
  into v_split_count, v_split_total
  from jsonb_to_recordset(p_splits) as x(member_id uuid, amount bigint);
  if v_split_count < 2 or v_split_total <> p_amount then
    raise exception 'shared expense split must allocate every KRW';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_splits) as x(member_id uuid, amount bigint)
    where x.amount < 0 or not public.member_belongs_to_household(x.member_id, p_household_id)
  ) then raise exception 'shared expense split member mismatch'; end if;
  if (select count(distinct x.member_id) from jsonb_to_recordset(p_splits) as x(member_id uuid, amount bigint)) <> v_split_count then
    raise exception 'shared expense split member is duplicated';
  end if;

  select * into v_existing from public.shared_expenses where id = v_expense_id for update;
  if found then
    if v_existing.household_id <> p_household_id then raise exception 'shared expense household is immutable'; end if;
    if v_existing.source_subscription_occurrence_id is not null then
      raise exception 'subscription shared expense must be edited at its source';
    end if;
    if v_existing.status in ('settled', 'void') then
      raise exception 'settled or void shared expense is immutable';
    end if;
    if v_existing.linked_transaction_id is distinct from p_linked_transaction_id
       and v_existing.linked_transaction_id is not null
       and not exists(
         select 1 from public.financial_transactions ft
         where ft.id = v_existing.linked_transaction_id and ft.owner_id = auth.uid()
       ) then
      raise exception 'only the transaction owner can change its shared expense link';
    end if;
    if exists(
      select 1 from public.settlements s
      join public.settlement_allocations sa on sa.settlement_id = s.id
      where s.household_id = p_household_id
        and v_existing.incurred_on between s.period_start and s.period_end
    ) then raise exception 'settled expense history is immutable'; end if;
  end if;

  if p_linked_transaction_id is not null then
    select * into v_transaction from public.financial_transactions
    where id = p_linked_transaction_id and owner_id = auth.uid() for update;
    if not found or v_transaction.kind <> 'expense' or v_transaction.direction <> 'outflow' then
      raise exception 'shared expense link requires owned expense outflow';
    end if;
    if v_transaction.amount <> p_amount then raise exception 'shared expense and transaction amounts must match'; end if;
    if p_payer_member_id <> v_actor_member_id then raise exception 'linked transaction payer must be current member'; end if;
    if exists(
      select 1 from public.shared_expenses
      where linked_transaction_id = p_linked_transaction_id and id <> v_expense_id
    ) then raise exception 'transaction already linked to shared expense'; end if;
  end if;

  insert into public.shared_expenses(
    id, household_id, created_by, payer_member_id, linked_transaction_id,
    category, entry_kind, description, amount, incurred_on, due_on, status, notes
  ) values (
    v_expense_id, p_household_id, auth.uid(), p_payer_member_id, p_linked_transaction_id,
    p_category, p_entry_kind, btrim(p_description), p_amount, p_incurred_on, p_due_on, 'confirmed', nullif(btrim(p_notes), '')
  )
  on conflict (id) do update set
    payer_member_id = excluded.payer_member_id,
    linked_transaction_id = excluded.linked_transaction_id,
    category = excluded.category,
    entry_kind = excluded.entry_kind,
    description = excluded.description,
    amount = excluded.amount,
    incurred_on = excluded.incurred_on,
    due_on = excluded.due_on,
    notes = excluded.notes,
    updated_at = now();

  delete from public.shared_expense_splits where shared_expense_id = v_expense_id;
  insert into public.shared_expense_splits(shared_expense_id, member_id, amount)
  select v_expense_id, x.member_id, x.amount
  from jsonb_to_recordset(p_splits) as x(member_id uuid, amount bigint);

  if v_existing.linked_transaction_id is distinct from p_linked_transaction_id
     and v_existing.linked_transaction_id is not null then
    update public.financial_transactions
    set scope = 'private', household_id = null, updated_at = now()
    where id = v_existing.linked_transaction_id and owner_id = auth.uid();
  end if;
  if p_linked_transaction_id is not null then
    update public.financial_transactions
    set scope = 'household', household_id = p_household_id, updated_at = now()
    where id = p_linked_transaction_id;
  end if;
  insert into public.audit_events(owner_id, household_id, actor_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), p_household_id, auth.uid(),
          (case when v_existing.id is null then 'create' else 'update' end)::public.audit_action,
          'shared_expense', v_expense_id, jsonb_build_object('amount', p_amount, 'entry_kind', p_entry_kind));
  return v_expense_id;
end;
$$;

create or replace function public.void_shared_expense(p_expense_id uuid)
returns public.shared_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.shared_expenses;
begin
  select * into v_expense from public.shared_expenses
  where id = p_expense_id and public.is_household_member(household_id) for update;
  if not found then raise exception 'shared expense not found or forbidden'; end if;
  if v_expense.source_subscription_occurrence_id is not null then
    raise exception 'subscription shared expense must be edited at its source';
  end if;
  if v_expense.status in ('settled', 'void') then
    raise exception 'settled or void shared expense is immutable';
  end if;
  if v_expense.linked_transaction_id is not null and not exists(
    select 1 from public.financial_transactions ft
    where ft.id = v_expense.linked_transaction_id and ft.owner_id = auth.uid()
  ) then
    raise exception 'only the transaction owner can void its linked shared expense';
  end if;
  if exists(
    select 1 from public.settlements s join public.settlement_allocations sa on sa.settlement_id = s.id
    where s.household_id = v_expense.household_id
      and v_expense.incurred_on between s.period_start and s.period_end
  ) then raise exception 'settled expense history is immutable'; end if;
  update public.shared_expenses set status = 'void', updated_at = now() where id = v_expense.id returning * into v_expense;
  update public.financial_transactions
  set scope = 'private', household_id = null, updated_at = now()
  where id = v_expense.linked_transaction_id and owner_id = auth.uid();
  insert into public.audit_events(owner_id, household_id, actor_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), v_expense.household_id, auth.uid(), 'cancel', 'shared_expense', v_expense.id, to_jsonb(v_expense));
  return v_expense;
end;
$$;

create or replace function public.refresh_settlement_suggestions(p_settlement_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement public.settlements;
  v_current_member_id uuid;
  v_direction public.transaction_direction;
  v_inserted integer;
begin
  select * into v_settlement from public.settlements
  where id = p_settlement_id and public.is_household_member(household_id);
  if not found or v_settlement.status not in ('open', 'partially_paid') then
    raise exception 'open settlement not found or forbidden';
  end if;
  select id into v_current_member_id from public.household_members
  where household_id = v_settlement.household_id and user_id = auth.uid() and status = 'active';
  v_direction := case when v_settlement.to_member_id = v_current_member_id then 'inflow' else 'outflow' end;
  insert into public.match_suggestions(owner_id, transaction_id, target_kind, target_id, confidence, evidence)
  select auth.uid(), ft.id, 'settlement', v_settlement.id,
         case when ft.amount <= v_settlement.amount_due - v_settlement.amount_paid then 0.9000 else 0.7000 end,
         jsonb_build_object('amount', 'within remaining settlement', 'direction', v_direction, 'confirmation_required', true)
  from public.financial_transactions ft
  where ft.owner_id = auth.uid()
    and ft.direction = v_direction
    and ft.kind <> 'transfer'
    and not exists(select 1 from public.settlement_allocations sa where sa.transaction_id = ft.id)
    and not exists(select 1 from public.receivable_allocations ra where ra.transaction_id = ft.id)
    and not exists(select 1 from public.subscription_occurrences so where so.matched_transaction_id = ft.id)
    and not exists(select 1 from public.shared_expenses se where se.linked_transaction_id = ft.id)
  on conflict (transaction_id, target_kind, target_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.confirm_settlement_match(p_suggestion_id uuid, p_amount bigint)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suggestion public.match_suggestions;
  v_settlement public.settlements;
  v_transaction public.financial_transactions;
  v_current_member_id uuid;
  v_direction public.transaction_direction;
  v_paid bigint;
begin
  select * into v_suggestion from public.match_suggestions
  where id = p_suggestion_id and owner_id = auth.uid() and status = 'suggested' and target_kind = 'settlement'
  for update;
  if not found then raise exception 'settlement suggestion not found or already resolved'; end if;
  select * into v_settlement from public.settlements
  where id = v_suggestion.target_id and public.is_household_member(household_id) for update;
  select * into v_transaction from public.financial_transactions
  where id = v_suggestion.transaction_id and owner_id = auth.uid() for update;
  if v_settlement.id is null or v_transaction.id is null then raise exception 'settlement match boundary mismatch'; end if;
  select id into v_current_member_id from public.household_members
  where household_id = v_settlement.household_id and user_id = auth.uid() and status = 'active';
  v_direction := case when v_settlement.to_member_id = v_current_member_id then 'inflow' else 'outflow' end;
  if v_transaction.direction <> v_direction or v_transaction.kind = 'transfer' then
    raise exception 'settlement transaction direction mismatch';
  end if;
  if p_amount <= 0 or p_amount > v_transaction.amount or p_amount > v_settlement.amount_due - v_settlement.amount_paid then
    raise exception 'settlement allocation exceeds remaining amount';
  end if;
  insert into public.settlement_allocations(
    settlement_id, owner_id, transaction_id, amount, created_by_member_id
  ) values (
    v_settlement.id, auth.uid(), v_transaction.id, p_amount, v_current_member_id
  );
  select coalesce(sum(amount), 0)::bigint into v_paid
  from public.settlement_allocations where settlement_id = v_settlement.id;
  update public.settlements
  set amount_paid = v_paid,
      status = case when v_paid = amount_due then 'paid'::public.settlement_status else 'partially_paid'::public.settlement_status end,
      paid_at = case when v_paid = amount_due then now() else null end,
      updated_at = now()
  where id = v_settlement.id returning * into v_settlement;
  update public.financial_transactions
  set scope = 'household', household_id = v_settlement.household_id, updated_at = now()
  where id = v_transaction.id;
  update public.match_suggestions set status = 'confirmed', confirmed_at = now(), updated_at = now()
  where id = v_suggestion.id;
  insert into public.audit_events(owner_id, household_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), v_settlement.household_id, auth.uid(), 'confirm', 'settlement', v_settlement.id,
          jsonb_build_object('transaction_id', null),
          jsonb_build_object('transaction_id', v_transaction.id, 'allocated_amount', p_amount));
  return v_settlement;
end;
$$;

create or replace function public.confirm_household_transaction_classification(
  p_transaction_id uuid,
  p_household_id uuid,
  p_other_member_id uuid,
  p_classification text,
  p_expense_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction public.financial_transactions;
  v_current_member_id uuid;
  v_first_member_id uuid;
  v_first_amount bigint;
  v_category public.shared_expense_category;
  v_splits jsonb;
begin
  select * into v_transaction from public.financial_transactions
  where id = p_transaction_id and owner_id = auth.uid() for update;
  if not found or v_transaction.kind <> 'expense' or v_transaction.direction <> 'outflow' then
    raise exception 'classification requires owned expense outflow';
  end if;
  if exists(
    select 1 from public.shared_expenses se
    where se.linked_transaction_id = v_transaction.id and se.status <> 'void'
  ) then
    raise exception 'transaction is already linked to a shared expense';
  end if;
  select id into v_current_member_id from public.household_members
  where household_id = p_household_id and user_id = auth.uid() and status = 'active';
  if v_current_member_id is null then raise exception 'classification actor must be an active household member'; end if;
  if p_classification = 'personal' then
    update public.financial_transactions set scope = 'private', household_id = null, updated_at = now()
    where id = v_transaction.id;
    insert into public.audit_events(owner_id, actor_id, action, entity_type, entity_id, after_data)
    values (auth.uid(), auth.uid(), 'confirm', 'financial_transaction', v_transaction.id,
            jsonb_build_object('classification', 'personal'));
    return null;
  end if;
  if not public.member_belongs_to_household(p_other_member_id, p_household_id)
     or p_other_member_id = v_current_member_id then
    raise exception 'classification roommate mismatch';
  end if;
  v_category := case p_classification
    when 'household_shopping' then 'household_goods'::public.shared_expense_category
    when 'housing' then 'rent'::public.shared_expense_category
    when 'utility' then 'electricity'::public.shared_expense_category
    else null end;
  if v_category is null then raise exception 'unsupported household classification'; end if;
  v_first_member_id := least(v_current_member_id, p_other_member_id);
  v_first_amount := (v_transaction.amount / 2) + (v_transaction.amount % 2);
  v_splits := jsonb_build_array(
    jsonb_build_object('member_id', v_first_member_id, 'amount', v_first_amount),
    jsonb_build_object(
      'member_id', case when v_first_member_id = v_current_member_id then p_other_member_id else v_current_member_id end,
      'amount', v_transaction.amount - v_first_amount
    )
  );
  return public.upsert_shared_expense(
    p_expense_id, p_household_id, v_current_member_id, v_category, 'charge',
    coalesce(v_transaction.counterparty, v_transaction.descriptor, 'household transaction'),
    v_transaction.amount, (v_transaction.occurred_at at time zone 'Asia/Seoul')::date,
    null, v_transaction.id, 'created from confirmed transaction classification', v_splits
  );
end;
$$;

create or replace view public.v_household_member_balances
with (security_invoker = true)
as
with expense_rows as (
  select se.household_id, se.payer_member_id as member_id,
         (case when se.entry_kind = 'refund' then -se.amount else se.amount end)::bigint as paid_amount,
         0::bigint as responsibility_amount,
         (case when se.entry_kind = 'refund' then -se.amount else se.amount end)::bigint as expense_credit,
         0::bigint as settlement_credit
  from public.shared_expenses se where se.status in ('confirmed', 'settled')
  union all
  select se.household_id, ses.member_id, 0::bigint,
         (case when se.entry_kind = 'refund' then -ses.amount else ses.amount end)::bigint,
         (case when se.entry_kind = 'refund' then ses.amount else -ses.amount end)::bigint,
         0::bigint
  from public.shared_expenses se
  join public.shared_expense_splits ses on ses.shared_expense_id = se.id
  where se.status in ('confirmed', 'settled')
), settlement_rows as (
  select household_id, from_member_id as member_id, 0::bigint as paid_amount,
         0::bigint as responsibility_amount, 0::bigint as expense_credit,
         amount_paid::bigint as settlement_credit
  from public.settlements where status <> 'void'
  union all
  select household_id, to_member_id, 0::bigint, 0::bigint, 0::bigint, -amount_paid::bigint
  from public.settlements where status <> 'void'
), all_rows as (
  select * from expense_rows union all select * from settlement_rows
)
select hm.household_id, hm.id as member_id,
       coalesce(sum(r.responsibility_amount), 0)::bigint as responsibility_amount,
       coalesce(sum(r.paid_amount), 0)::bigint as paid_amount,
       coalesce(sum(r.expense_credit), 0)::bigint as net_credit_before_settlement,
       coalesce(sum(r.expense_credit + r.settlement_credit), 0)::bigint as net_credit_after_settlement
from public.household_members hm
left join all_rows r on r.household_id = hm.household_id and r.member_id = hm.id
where hm.status = 'active'
group by hm.household_id, hm.id;

create or replace function public.responsibility_adjusted_money(p_owner_id uuid, p_month date)
returns table (
  actual_cash_outflow bigint,
  personal_expenses bigint,
  household_responsibility bigint,
  settled_income_excluding_settlements bigint,
  confirmed_reimbursements bigint,
  responsibility_adjusted_remainder bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_member_ids uuid[];
begin
  if p_owner_id <> auth.uid() then raise exception 'forbidden'; end if;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_member_ids
  from public.household_members where user_id = p_owner_id and status = 'active';
  select coalesce(sum(ft.amount), 0)::bigint into actual_cash_outflow
  from public.financial_transactions ft
  where ft.owner_id = p_owner_id and ft.kind = 'expense' and ft.direction = 'outflow'
    and (ft.occurred_at at time zone 'Asia/Seoul')::date >= v_start
    and (ft.occurred_at at time zone 'Asia/Seoul')::date < v_end;
  select coalesce(sum(ft.amount), 0)::bigint into personal_expenses
  from public.financial_transactions ft
  where ft.owner_id = p_owner_id and ft.kind = 'expense' and ft.direction = 'outflow'
    and ft.scope = 'private'
    and not exists(select 1 from public.settlement_allocations sa where sa.transaction_id = ft.id)
    and (ft.occurred_at at time zone 'Asia/Seoul')::date >= v_start
    and (ft.occurred_at at time zone 'Asia/Seoul')::date < v_end;
  select coalesce(sum(case when se.entry_kind = 'refund' then -ses.amount else ses.amount end), 0)::bigint
  into household_responsibility
  from public.shared_expense_splits ses join public.shared_expenses se on se.id = ses.shared_expense_id
  where ses.member_id = any(v_member_ids) and se.status in ('confirmed', 'settled')
    and se.incurred_on >= v_start and se.incurred_on < v_end;
  select coalesce(sum(ft.amount), 0)::bigint into settled_income_excluding_settlements
  from public.financial_transactions ft
  where ft.owner_id = p_owner_id and ft.kind = 'income' and ft.direction = 'inflow'
    and not exists(select 1 from public.settlement_allocations sa where sa.transaction_id = ft.id)
    and (ft.occurred_at at time zone 'Asia/Seoul')::date >= v_start
    and (ft.occurred_at at time zone 'Asia/Seoul')::date < v_end;
  select coalesce(sum(sa.amount), 0)::bigint into confirmed_reimbursements
  from public.settlement_allocations sa
  join public.settlements s on s.id = sa.settlement_id
  join public.financial_transactions ft on ft.id = sa.transaction_id
  where sa.owner_id = p_owner_id and s.to_member_id = any(v_member_ids)
    and (ft.occurred_at at time zone 'Asia/Seoul')::date >= v_start
    and (ft.occurred_at at time zone 'Asia/Seoul')::date < v_end;
  responsibility_adjusted_remainder := settled_income_excluding_settlements - personal_expenses
                                       - household_responsibility + confirmed_reimbursements;
  return next;
end;
$$;

-- This member projection intentionally exposes only whether the current user owns
-- a backing transaction, never another member's account, counterparty, or descriptor.
create or replace view public.v_shared_expense_member_projection
with (security_invoker = true)
as
select se.id, se.household_id, se.payer_member_id, se.category, se.entry_kind,
       se.description, se.amount, se.incurred_on, se.due_on, se.status,
       exists(
         select 1 from public.financial_transactions ft
         where ft.id = se.linked_transaction_id and ft.owner_id = auth.uid()
       ) as linked_to_my_transaction
from public.shared_expenses se;

revoke all on function public.upsert_shared_expense(uuid, uuid, uuid, public.shared_expense_category, public.shared_expense_entry_kind, text, bigint, date, date, uuid, text, jsonb) from public;
revoke all on function public.void_shared_expense(uuid) from public;
revoke all on function public.refresh_settlement_suggestions(uuid) from public;
revoke all on function public.confirm_settlement_match(uuid, bigint) from public;
revoke all on function public.confirm_household_transaction_classification(uuid, uuid, uuid, text, uuid) from public;
grant execute on function public.upsert_shared_expense(uuid, uuid, uuid, public.shared_expense_category, public.shared_expense_entry_kind, text, bigint, date, date, uuid, text, jsonb) to authenticated;
grant execute on function public.void_shared_expense(uuid) to authenticated;
grant execute on function public.refresh_settlement_suggestions(uuid) to authenticated;
grant execute on function public.confirm_settlement_match(uuid, bigint) to authenticated;
grant execute on function public.confirm_household_transaction_classification(uuid, uuid, uuid, text, uuid) to authenticated;
