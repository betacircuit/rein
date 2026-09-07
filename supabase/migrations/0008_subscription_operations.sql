-- Student OS migration 0008: subscription lifecycle, occurrence materialization,
-- effective-dated prices, and explicit transaction matching.

alter table public.subscription_price_history
  add column effective_until date,
  add column change_reason text,
  add column created_by uuid references public.profiles(id) on delete set null,
  add constraint subscription_price_history_effective_range
    check (effective_until is null or effective_until >= effective_on);

alter table public.subscription_occurrences
  add column price_history_id uuid references public.subscription_price_history(id) on delete restrict,
  add column generated_key text,
  add column skipped_reason text;

create unique index subscription_occurrences_due_unique
  on public.subscription_occurrences(subscription_id, due_on);
create unique index subscription_occurrences_generated_key_unique
  on public.subscription_occurrences(subscription_id, generated_key)
  where generated_key is not null;

create or replace function public.next_subscription_due(
  p_current date,
  p_anchor date,
  p_cycle public.billing_cycle,
  p_custom_days integer default null
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_months integer;
  v_month_start date;
  v_last_day integer;
  v_anchor_day integer := extract(day from p_anchor)::integer;
begin
  if p_cycle = 'weekly' then return p_current + 7; end if;
  if p_cycle = 'custom_days' then
    if p_custom_days is null or p_custom_days <= 0 then
      raise exception 'custom cycle requires positive days';
    end if;
    return p_current + p_custom_days;
  end if;
  v_months := case p_cycle
    when 'monthly' then 1
    when 'quarterly' then 3
    when 'semiannual' then 6
    when 'yearly' then 12
  end;
  v_month_start := (date_trunc('month', p_current) + make_interval(months => v_months))::date;
  v_last_day := extract(day from (v_month_start + interval '1 month - 1 day'))::integer;
  return v_month_start + least(v_anchor_day, v_last_day) - 1;
end;
$$;

create or replace function public.subscription_monthly_equivalent(
  p_amount bigint,
  p_cycle public.billing_cycle,
  p_custom_days integer default null
)
returns numeric
language sql
immutable
as $$
  select case p_cycle
    when 'weekly' then p_amount::numeric * 52 / 12
    when 'monthly' then p_amount::numeric
    when 'quarterly' then p_amount::numeric / 3
    when 'semiannual' then p_amount::numeric / 6
    when 'yearly' then p_amount::numeric / 12
    when 'custom_days' then p_amount::numeric * 365.2425 / (p_custom_days * 12)
  end;
$$;

create or replace function public.validate_subscription_shape()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_distinct_reminders integer;
begin
  if new.currency <> 'KRW' then raise exception 'subscriptions currently require KRW'; end if;
  if new.service_url is not null and new.service_url !~* '^https://' then
    raise exception 'subscription service URL must use HTTPS';
  end if;
  if exists(select 1 from unnest(new.reminder_days_before) value where value < 0 or value > 365) then
    raise exception 'subscription reminder days must be between 0 and 365';
  end if;
  select count(distinct value) into v_distinct_reminders from unnest(new.reminder_days_before) value;
  if v_distinct_reminders <> cardinality(new.reminder_days_before) then
    raise exception 'subscription reminder days must be unique';
  end if;
  if new.payment_account_id is not null and not exists(
    select 1 from public.accounts a where a.id = new.payment_account_id and a.owner_id = new.owner_id
  ) then raise exception 'subscription payment account owner mismatch'; end if;
  if new.scope = 'household' and not exists(
    select 1 from public.household_members hm
    where hm.id = new.payer_member_id and hm.household_id = new.household_id and hm.status = 'active'
  ) then raise exception 'subscription payer must be an active household member'; end if;
  if tg_op = 'UPDATE'
     and old.status in ('cancelled', 'ended')
     and new.status is distinct from old.status then
    raise exception 'terminal subscription status cannot be reactivated';
  end if;
  return new;
end;
$$;

create trigger validate_subscription_shape_before_write
before insert or update on public.subscriptions
for each row execute function public.validate_subscription_shape();

create or replace function public.stop_terminal_subscription_occurrences()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_stop date;
begin
  if new.status not in ('cancelled', 'ended') or new.status is not distinct from old.status then
    return new;
  end if;
  v_stop := case when new.status = 'cancelled'
    then (new.cancelled_at at time zone 'Asia/Seoul')::date
    else (new.ended_at at time zone 'Asia/Seoul')::date end;
  update public.subscription_occurrences
  set status = 'skipped', skipped_reason = new.status::text, updated_at = now()
  where subscription_id = new.id and due_on > v_stop
    and status in ('scheduled', 'unmatched');
  return new;
end;
$$;

create trigger stop_terminal_subscription_occurrences_after_update
after update of status on public.subscriptions
for each row execute function public.stop_terminal_subscription_occurrences();

create or replace function public.protect_paid_subscription_occurrence()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'paid' and (
    new.subscription_id is distinct from old.subscription_id
    or new.period_start is distinct from old.period_start
    or new.period_end is distinct from old.period_end
    or new.due_on is distinct from old.due_on
    or new.expected_amount is distinct from old.expected_amount
    or new.price_history_id is distinct from old.price_history_id
    or new.matched_transaction_id is distinct from old.matched_transaction_id
    or new.paid_at is distinct from old.paid_at
  ) then raise exception 'paid subscription occurrence history is immutable'; end if;
  return new;
end;
$$;

create trigger protect_paid_subscription_occurrence_before_update
before update on public.subscription_occurrences
for each row execute function public.protect_paid_subscription_occurrence();

create or replace function public.materialize_subscription_occurrences(
  p_subscription_id uuid,
  p_horizon_until date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sub public.subscriptions;
  v_due date;
  v_next date;
  v_stop date;
  v_price public.subscription_price_history;
  v_created integer := 0;
  v_guard integer := 0;
begin
  select * into v_sub from public.subscriptions
  where id = p_subscription_id and owner_id = auth.uid() for update;
  if not found then raise exception 'subscription not found or forbidden'; end if;
  if v_sub.status = 'paused' or v_sub.next_billing_on is null then return 0; end if;
  v_stop := case
    when v_sub.status = 'cancelled' then (v_sub.cancelled_at at time zone 'Asia/Seoul')::date
    when v_sub.status = 'ended' then (v_sub.ended_at at time zone 'Asia/Seoul')::date
    else null end;
  v_due := v_sub.next_billing_on;
  while v_due <= p_horizon_until and v_guard < 400 loop
    v_guard := v_guard + 1;
    if v_stop is not null and v_due > v_stop then exit; end if;
    v_next := public.next_subscription_due(
      v_due, v_sub.billing_anchor_on, v_sub.billing_cycle, v_sub.custom_cycle_days
    );
    select * into v_price from public.subscription_price_history
    where subscription_id = v_sub.id and effective_on <= v_due
      and (effective_until is null or effective_until >= v_due)
    order by effective_on desc limit 1;
    if v_price.id is null then raise exception 'subscription occurrence requires effective price'; end if;
    insert into public.subscription_occurrences(
      subscription_id, period_start, period_end, due_on, expected_amount,
      price_history_id, generated_key, status
    ) values (
      v_sub.id, v_due, v_next - 1, v_due, v_price.amount,
      v_price.id, v_sub.id::text || ':' || v_due::text,
      case when v_due < (now() at time zone 'Asia/Seoul')::date
        then 'unmatched'::public.subscription_occurrence_status
        else 'scheduled'::public.subscription_occurrence_status end
    ) on conflict (subscription_id, due_on) do nothing;
    if found then v_created := v_created + 1; end if;
    v_due := v_next;
    v_price := null;
  end loop;
  return v_created;
end;
$$;

create or replace function public.change_subscription_price(
  p_subscription_id uuid,
  p_amount bigint,
  p_effective_on date,
  p_reason text default null
)
returns public.subscription_price_history
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_history public.subscription_price_history;
begin
  if p_amount <= 0 then raise exception 'subscription price must be positive'; end if;
  if not exists(select 1 from public.subscriptions where id = p_subscription_id and owner_id = auth.uid()) then
    raise exception 'subscription not found or forbidden';
  end if;
  update public.subscription_price_history
  set effective_until = p_effective_on - 1
  where subscription_id = p_subscription_id and effective_on < p_effective_on
    and (effective_until is null or effective_until >= p_effective_on);
  insert into public.subscription_price_history(
    subscription_id, effective_on, effective_until, amount, currency, note, change_reason, created_by
  ) values (
    p_subscription_id,
    p_effective_on,
    (select min(effective_on) - 1 from public.subscription_price_history
      where subscription_id = p_subscription_id and effective_on > p_effective_on),
    p_amount,
    'KRW',
    p_reason,
    p_reason,
    auth.uid()
  )
  returning * into v_history;
  update public.subscriptions s
  set amount = latest.amount, updated_at = now()
  from (
    select amount from public.subscription_price_history
    where subscription_id = p_subscription_id order by effective_on desc limit 1
  ) latest
  where s.id = p_subscription_id;
  update public.subscription_occurrences occurrence
  set expected_amount = applicable.amount,
      price_history_id = applicable.id,
      updated_at = now()
  from public.subscription_price_history applicable
  where occurrence.subscription_id = p_subscription_id
    and occurrence.due_on >= p_effective_on
    and occurrence.status in ('scheduled', 'unmatched')
    and applicable.id = (
      select candidate.id from public.subscription_price_history candidate
      where candidate.subscription_id = occurrence.subscription_id
        and candidate.effective_on <= occurrence.due_on
        and (candidate.effective_until is null or candidate.effective_until >= occurrence.due_on)
      order by candidate.effective_on desc limit 1
    );
  return v_history;
end;
$$;

create or replace function public.confirm_subscription_match(p_suggestion_id uuid)
returns public.subscription_occurrences
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_suggestion public.match_suggestions;
  v_occurrence public.subscription_occurrences;
  v_subscription public.subscriptions;
  v_transaction public.financial_transactions;
  v_shared_expense_id uuid;
begin
  select * into v_suggestion from public.match_suggestions
  where id = p_suggestion_id and owner_id = auth.uid() and status = 'suggested'
  for update;
  if not found then raise exception 'subscription suggestion not found or already resolved'; end if;
  if v_suggestion.target_kind <> 'subscription_occurrence' then
    raise exception 'suggestion target is not a subscription occurrence';
  end if;
  select so.* into v_occurrence from public.subscription_occurrences so
  join public.subscriptions s on s.id = so.subscription_id
  where so.id = v_suggestion.target_id and s.owner_id = auth.uid() for update of so;
  select * into v_transaction from public.financial_transactions
  where id = v_suggestion.transaction_id and owner_id = auth.uid() for update;
  if v_occurrence.id is null or v_transaction.id is null then raise exception 'subscription match boundary mismatch'; end if;
  if v_occurrence.status not in ('scheduled', 'unmatched') then raise exception 'subscription occurrence already resolved'; end if;
  if v_transaction.kind <> 'expense' or v_transaction.direction <> 'outflow' then
    raise exception 'subscription match requires expense outflow';
  end if;
  if exists(select 1 from public.subscription_occurrences where matched_transaction_id = v_transaction.id) then
    raise exception 'transaction already matched to a subscription occurrence';
  end if;
  update public.subscription_occurrences
  set status = 'paid', matched_transaction_id = v_transaction.id, paid_at = now(), updated_at = now()
  where id = v_occurrence.id returning * into v_occurrence;
  select * into v_subscription from public.subscriptions where id = v_occurrence.subscription_id;
  if v_subscription.scope = 'household' then
    v_shared_expense_id := public.ensure_household_subscription_expense(v_occurrence.id);
    update public.shared_expenses set linked_transaction_id = v_transaction.id
    where id = v_shared_expense_id;
    select * into v_occurrence from public.subscription_occurrences where id = v_occurrence.id;
  end if;
  update public.match_suggestions
  set status = 'confirmed', confirmed_at = now(), updated_at = now()
  where id = v_suggestion.id;
  insert into public.audit_events(owner_id, household_id, actor_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), v_subscription.household_id, auth.uid(), 'confirm', 'subscription_occurrence', v_occurrence.id, to_jsonb(v_occurrence));
  return v_occurrence;
end;
$$;

create or replace view public.v_subscription_overview
with (security_invoker = true)
as
select
  s.*,
  round(public.subscription_monthly_equivalent(s.amount, s.billing_cycle, s.custom_cycle_days), 0)::bigint as monthly_equivalent_krw,
  coalesce((
    select sum(so.expected_amount)::bigint from public.subscription_occurrences so
    where so.subscription_id = s.id
      and so.due_on >= (now() at time zone 'Asia/Seoul')::date
      and so.due_on <= (now() at time zone 'Asia/Seoul')::date + 365
      and so.status in ('scheduled', 'unmatched')
  ), 0)::bigint as annual_projection_krw,
  case
    when s.cancel_by_on is not null and s.cancel_by_on <= (now() at time zone 'Asia/Seoul')::date + 7 then 'cancel_by_soon'
    when s.trial_ends_on is not null and s.trial_ends_on <= (now() at time zone 'Asia/Seoul')::date + 7 then 'trial_ending'
    when s.next_billing_on is not null and s.next_billing_on <= (now() at time zone 'Asia/Seoul')::date + 7 then 'due_7d'
    when s.next_billing_on is not null and s.next_billing_on <= (now() at time zone 'Asia/Seoul')::date + 30 then 'due_30d'
    else 'normal'
  end as attention_state
from public.subscriptions s;

revoke all on function public.materialize_subscription_occurrences(uuid, date) from public;
revoke all on function public.change_subscription_price(uuid, bigint, date, text) from public;
revoke all on function public.confirm_subscription_match(uuid) from public;
grant execute on function public.materialize_subscription_occurrences(uuid, date) to authenticated;
grant execute on function public.change_subscription_price(uuid, bigint, date, text) to authenticated;
grant execute on function public.confirm_subscription_match(uuid) to authenticated;
