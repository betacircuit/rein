-- Student OS migration 0011: actor-bound Grow plans and contributions,
-- responsibility-adjusted surplus, dated asset snapshots, and tutoring analytics.

alter type public.contribution_status add value if not exists 'partially_completed';
alter type public.contribution_status add value if not exists 'cancelled';

alter table public.grow_plans
  add column contribution_cap bigint not null default 9223372036854775807
  check (contribution_cap >= 0);

alter table public.investment_contributions
  add column planned_amount bigint,
  add column completed_amount bigint not null default 0 check (completed_amount >= 0);
update public.investment_contributions
set planned_amount = amount,
    completed_amount = case when status = 'completed' then amount else 0 end;
alter table public.investment_contributions
  alter column planned_amount set not null,
  add constraint investment_contributions_planned_amount_nonnegative check (planned_amount >= 0),
  add constraint investment_contributions_completed_within_plan check (completed_amount <= planned_amount);
create unique index investment_contributions_one_month
  on public.investment_contributions(owner_id, date_trunc('month', planned_for::timestamp));

create table public.investment_contribution_transfers (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.investment_contributions(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  transfer_group_id uuid not null,
  amount bigint not null check (amount > 0),
  idempotency_key text not null check (nullif(trim(idempotency_key), '') is not null),
  created_at timestamptz not null default now(),
  unique(owner_id, transfer_group_id),
  unique(owner_id, idempotency_key)
);
create index investment_contribution_transfers_contribution_idx
  on public.investment_contribution_transfers(contribution_id, created_at);

create table public.dismissed_insights (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  insight_key text not null check (nullif(trim(insight_key), '') is not null),
  dismissed_at timestamptz not null default now(),
  primary key(owner_id, insight_key)
);

alter table public.investment_contribution_transfers enable row level security;
alter table public.investment_contribution_transfers force row level security;
alter table public.dismissed_insights enable row level security;
alter table public.dismissed_insights force row level security;
create policy investment_contribution_transfers_owner_select
  on public.investment_contribution_transfers for select using (owner_id = auth.uid());
create policy dismissed_insights_owner_select
  on public.dismissed_insights for select using (owner_id = auth.uid());

drop policy if exists grow_plans_owner_all on public.grow_plans;
drop policy if exists investment_contributions_owner_all on public.investment_contributions;
create policy grow_plans_owner_select on public.grow_plans for select using (owner_id = auth.uid());
create policy investment_contributions_owner_select
  on public.investment_contributions for select using (owner_id = auth.uid());
revoke insert, update, delete on public.grow_plans from authenticated;
revoke insert, update, delete on public.investment_contributions from authenticated;
revoke insert, update, delete on public.investment_contribution_transfers from authenticated;
revoke insert, update, delete on public.dismissed_insights from authenticated;

create or replace function public.upsert_grow_plan(
  p_plan_id uuid,
  p_rule_kind public.grow_rule_kind,
  p_fixed_amount bigint,
  p_basis_points integer,
  p_contribution_cap bigint,
  p_safety_reserve_target bigint,
  p_reserve_account_id uuid,
  p_investment_account_id uuid,
  p_review_day smallint default 1
)
returns public.grow_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_plan public.grow_plans;
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  if p_contribution_cap < 0 or p_safety_reserve_target < 0 or p_review_day not between 1 and 28 then
    raise exception 'invalid grow plan limits';
  end if;
  if (p_rule_kind = 'fixed_amount' and (p_fixed_amount is null or p_fixed_amount < 0 or p_basis_points is not null))
     or (p_rule_kind = 'percentage' and (p_basis_points is null or p_basis_points not between 0 and 10000 or p_fixed_amount is not null)) then
    raise exception 'invalid grow contribution rule';
  end if;
  if not exists(select 1 from public.accounts where id = p_reserve_account_id and owner_id = v_owner and is_active) then
    raise exception 'reserve account not found or forbidden';
  end if;
  if not exists(select 1 from public.accounts where id = p_investment_account_id and owner_id = v_owner and is_active and account_type = 'investment') then
    raise exception 'investment account not found or forbidden';
  end if;
  if p_reserve_account_id = p_investment_account_id then raise exception 'grow accounts must differ'; end if;

  update public.grow_plans set is_active = false where owner_id = v_owner and is_active and id <> p_plan_id;
  insert into public.grow_plans(
    id, owner_id, is_active, rule_kind, fixed_contribution_amount,
    contribution_basis_points, contribution_cap, safety_reserve_target,
    reserve_account_id, investment_account_id, review_day
  ) values (
    coalesce(p_plan_id, gen_random_uuid()), v_owner, true, p_rule_kind, p_fixed_amount,
    p_basis_points, p_contribution_cap, p_safety_reserve_target,
    p_reserve_account_id, p_investment_account_id, p_review_day
  )
  on conflict (id) do update set
    is_active = true,
    rule_kind = excluded.rule_kind,
    fixed_contribution_amount = excluded.fixed_contribution_amount,
    contribution_basis_points = excluded.contribution_basis_points,
    contribution_cap = excluded.contribution_cap,
    safety_reserve_target = excluded.safety_reserve_target,
    reserve_account_id = excluded.reserve_account_id,
    investment_account_id = excluded.investment_account_id,
    review_day = excluded.review_day
  where grow_plans.owner_id = v_owner
  returning * into v_plan;
  if not found then raise exception 'grow plan not found or forbidden'; end if;
  return v_plan;
end;
$$;

drop function if exists public.available_surplus(uuid, date);
create function public.available_surplus(p_owner_id uuid, p_month date)
returns table (
  settled_cash_income bigint,
  confirmed_reimbursements bigint,
  actual_cash_outflow bigint,
  private_expenses bigint,
  household_responsibility bigint,
  unpaid_subscription_obligations bigint,
  safety_reserve_topup bigint,
  actual_cash_remaining bigint,
  available_surplus bigint
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
  v_reserve_target bigint := 0;
  v_reserve_balance bigint := 0;
begin
  if p_owner_id <> auth.uid() then raise exception 'forbidden'; end if;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_member_ids
  from public.household_members where user_id = p_owner_id and status = 'active';

  select r.actual_cash_outflow, r.personal_expenses, r.household_responsibility,
         r.settled_income_excluding_settlements, r.confirmed_reimbursements
  into actual_cash_outflow, private_expenses, household_responsibility,
       settled_cash_income, confirmed_reimbursements
  from public.responsibility_adjusted_money(p_owner_id, p_month) r;

  select coalesce(sum(
    case when s.scope = 'private' then so.expected_amount
         else so.expected_amount * coalesce(ss.share_basis_points, 0) / 10000 end
  ), 0)::bigint into unpaid_subscription_obligations
  from public.subscription_occurrences so
  join public.subscriptions s on s.id = so.subscription_id
  left join public.subscription_splits ss
    on ss.subscription_id = s.id and ss.member_id = any(v_member_ids)
  where s.owner_id = p_owner_id and s.status in ('active', 'trial')
    and so.due_on >= v_start and so.due_on < v_end
    and so.status in ('scheduled', 'unmatched') and so.matched_transaction_id is null;

  select gp.safety_reserve_target, coalesce(a.current_balance, 0)
  into v_reserve_target, v_reserve_balance
  from public.grow_plans gp left join public.accounts a on a.id = gp.reserve_account_id
  where gp.owner_id = p_owner_id and gp.is_active limit 1;

  safety_reserve_topup := greatest(coalesce(v_reserve_target, 0) - coalesce(v_reserve_balance, 0), 0);
  actual_cash_remaining := settled_cash_income + confirmed_reimbursements - actual_cash_outflow;
  available_surplus := settled_cash_income + confirmed_reimbursements - private_expenses
    - household_responsibility - unpaid_subscription_obligations - safety_reserve_topup;
  return next;
end;
$$;

create or replace function public.record_grow_contribution(
  p_plan_id uuid,
  p_month date,
  p_amount bigint,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_occurred_at timestamptz,
  p_idempotency_key text
)
returns public.investment_contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_plan public.grow_plans;
  v_contribution public.investment_contributions;
  v_transfer_group uuid;
  v_available bigint;
  v_planned bigint;
  v_completed bigint;
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  if p_amount <= 0 or nullif(trim(p_idempotency_key), '') is null then raise exception 'invalid contribution'; end if;
  select * into v_contribution from public.investment_contributions ic
  where ic.owner_id = v_owner and exists(
    select 1 from public.investment_contribution_transfers ict
    where ict.contribution_id = ic.id and ict.owner_id = v_owner and ict.idempotency_key = p_idempotency_key
  );
  if found then return v_contribution; end if;

  select * into v_plan from public.grow_plans
  where id = p_plan_id and owner_id = v_owner and is_active for update;
  if not found then raise exception 'grow plan not found or forbidden'; end if;
  if v_plan.reserve_account_id <> p_from_account_id or v_plan.investment_account_id <> p_to_account_id then
    raise exception 'contribution accounts do not match active plan';
  end if;
  select greatest(a.available_surplus, 0) into v_available
  from public.available_surplus(v_owner, p_month) a;
  v_planned := least(
    v_available,
    v_plan.contribution_cap,
    case when v_plan.rule_kind = 'fixed_amount' then v_plan.fixed_contribution_amount
         else v_available * v_plan.contribution_basis_points / 10000 end
  );
  if v_planned <= 0 or p_amount > v_planned then raise exception 'contribution exceeds current plan'; end if;

  select * into v_contribution from public.investment_contributions
  where owner_id = v_owner and date_trunc('month', planned_for) = date_trunc('month', p_month)
  for update;
  v_completed := coalesce(v_contribution.completed_amount, 0) + p_amount;
  if v_completed > v_planned then raise exception 'contribution exceeds remaining plan'; end if;
  v_transfer_group := public.record_internal_transfer(
    p_from_account_id, p_to_account_id, p_amount, p_occurred_at, 'Grow contribution'
  );
  if v_contribution.id is null then
    insert into public.investment_contributions(
      owner_id, grow_plan_id, from_account_id, to_account_id, transfer_group_id,
      planned_for, amount, planned_amount, completed_amount, status, completed_at
    ) values (
      v_owner, v_plan.id, p_from_account_id, p_to_account_id, v_transfer_group,
      date_trunc('month', p_month)::date, v_planned, v_planned, v_completed,
      case when v_completed = v_planned then 'completed' else 'partially_completed' end,
      case when v_completed = v_planned then p_occurred_at else null end
    ) returning * into v_contribution;
  else
    update public.investment_contributions set
      planned_amount = v_planned, amount = v_planned, completed_amount = v_completed,
      status = case when v_completed = v_planned then 'completed' else 'partially_completed' end,
      completed_at = case when v_completed = v_planned then p_occurred_at else null end
    where id = v_contribution.id returning * into v_contribution;
  end if;
  insert into public.investment_contribution_transfers(
    contribution_id, owner_id, transfer_group_id, amount, idempotency_key
  ) values (v_contribution.id, v_owner, v_transfer_group, p_amount, p_idempotency_key);
  return v_contribution;
end;
$$;

create or replace function public.dismiss_local_insight(p_insight_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(trim(p_insight_key), '') is null then raise exception 'invalid insight key'; end if;
  insert into public.dismissed_insights(owner_id, insight_key)
  values (auth.uid(), p_insight_key) on conflict do nothing;
end;
$$;

create or replace view public.v_asset_summary
with (security_invoker = true)
as
select owner_id,
  coalesce(sum(current_balance) filter (where account_type <> 'investment' and included_in_totals), 0)::bigint as cash_assets,
  coalesce(sum(current_balance) filter (where account_type = 'investment'), 0)::bigint as long_term_investment_value,
  (coalesce(sum(current_balance) filter (where account_type <> 'investment' and included_in_totals), 0)
   + coalesce(sum(current_balance) filter (where account_type = 'investment'), 0))::bigint as total_assets,
  min(balance_as_of) as as_of
from public.accounts where is_active group by owner_id;

create or replace view public.v_tutoring_effective_hourly
with (security_invoker = true)
as
select l.owner_id, l.student_id, date_trunc('month', l.starts_at at time zone 'Asia/Seoul')::date as month,
  count(*)::integer as completed_lessons,
  sum(l.amount)::bigint as earned_amount,
  sum(extract(epoch from (l.ends_at - l.starts_at)) / 60 + l.prep_minutes + l.travel_minutes)::bigint as effective_minutes,
  round(sum(l.amount)::numeric * 60 / nullif(sum(extract(epoch from (l.ends_at - l.starts_at)) / 60 + l.prep_minutes + l.travel_minutes), 0))::bigint as effective_hourly_income
from public.lessons l where l.status = 'completed'
group by l.owner_id, l.student_id, date_trunc('month', l.starts_at at time zone 'Asia/Seoul');

revoke all on function public.upsert_grow_plan(uuid, public.grow_rule_kind, bigint, integer, bigint, bigint, uuid, uuid, smallint) from public;
revoke all on function public.record_grow_contribution(uuid, date, bigint, uuid, uuid, timestamptz, text) from public;
revoke all on function public.dismiss_local_insight(text) from public;
grant execute on function public.upsert_grow_plan(uuid, public.grow_rule_kind, bigint, integer, bigint, bigint, uuid, uuid, smallint) to authenticated;
grant execute on function public.record_grow_contribution(uuid, date, bigint, uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.dismiss_local_insight(text) to authenticated;
