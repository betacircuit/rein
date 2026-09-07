-- Student OS migration 0003: functions, invariants, views, RLS

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

create or replace function public.is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
      and hm.role = 'owner'
  );
$$;

create or replace function public.is_household_creator(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.households h
    where h.id = p_household_id and h.created_by = auth.uid()
  );
$$;

create or replace function public.member_belongs_to_household(p_member_id uuid, p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.id = p_member_id
      and hm.household_id = p_household_id
      and hm.status <> 'left'
  );
$$;

create or replace function public.my_household_member_id(p_household_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.id from public.household_members hm
  where hm.household_id = p_household_id
    and hm.user_id = auth.uid()
    and hm.status = 'active'
  limit 1;
$$;

-- Cross-table owner and household consistency.
create or replace function public.validate_owned_relations()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if tg_table_name = 'tutoring_schedules' then
    select owner_id into v_owner from public.students where id = new.student_id;
    if v_owner is distinct from new.owner_id then raise exception 'student owner mismatch'; end if;
  elsif tg_table_name = 'lessons' then
    select owner_id into v_owner from public.students where id = new.student_id;
    if v_owner is distinct from new.owner_id then raise exception 'student owner mismatch'; end if;
  elsif tg_table_name = 'receivables' then
    select owner_id into v_owner from public.lessons where id = new.lesson_id;
    if v_owner is distinct from new.owner_id then raise exception 'lesson owner mismatch'; end if;
  elsif tg_table_name = 'financial_transactions' then
    select owner_id into v_owner from public.accounts where id = new.account_id;
    if v_owner is distinct from new.owner_id then raise exception 'account owner mismatch'; end if;
  elsif tg_table_name = 'subscriptions' then
    if new.payment_account_id is not null then
      select owner_id into v_owner from public.accounts where id = new.payment_account_id;
      if v_owner is distinct from new.owner_id then raise exception 'payment account owner mismatch'; end if;
    end if;
    if new.scope = 'household' and not public.member_belongs_to_household(new.payer_member_id, new.household_id) then
      raise exception 'subscription payer is not in household';
    end if;
  elsif tg_table_name = 'shared_expenses' then
    if not public.member_belongs_to_household(new.payer_member_id, new.household_id) then
      raise exception 'payer is not in household';
    end if;
  elsif tg_table_name = 'settlements' then
    if not public.member_belongs_to_household(new.from_member_id, new.household_id)
       or not public.member_belongs_to_household(new.to_member_id, new.household_id) then
      raise exception 'settlement member mismatch';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_tutoring_schedule_relations before insert or update on public.tutoring_schedules
for each row execute function public.validate_owned_relations();
create trigger validate_lesson_relations before insert or update on public.lessons
for each row execute function public.validate_owned_relations();
create trigger validate_receivable_relations before insert or update on public.receivables
for each row execute function public.validate_owned_relations();
create trigger validate_transaction_relations before insert or update on public.financial_transactions
for each row execute function public.validate_owned_relations();
create trigger validate_subscription_relations before insert or update on public.subscriptions
for each row execute function public.validate_owned_relations();
create trigger validate_shared_expense_relations before insert or update on public.shared_expenses
for each row execute function public.validate_owned_relations();
create trigger validate_settlement_relations before insert or update on public.settlements
for each row execute function public.validate_owned_relations();

-- Completing a lesson is idempotent and creates exactly one receivable.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns public.receivables
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons;
  v_receivable public.receivables;
begin
  select * into v_lesson from public.lessons
  where id = p_lesson_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'lesson not found or forbidden'; end if;
  if v_lesson.status = 'cancelled' then raise exception 'cancelled lesson cannot be completed'; end if;

  update public.lessons
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where id = p_lesson_id;

  insert into public.receivables(owner_id, student_id, lesson_id, amount_due, status)
  values (v_lesson.owner_id, v_lesson.student_id, v_lesson.id, v_lesson.amount, 'open')
  on conflict (lesson_id) do update
    set amount_due = excluded.amount_due,
        updated_at = now()
    where public.receivables.status in ('open', 'partially_paid')
  returning * into v_receivable;

  if v_receivable.id is null then
    select * into v_receivable from public.receivables where lesson_id = p_lesson_id;
  end if;
  return v_receivable;
end;
$$;

create or replace function public.validate_receivable_allocation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_due bigint;
  v_allocated bigint;
  v_receivable_owner uuid;
  v_tx_owner uuid;
  v_direction public.transaction_direction;
  v_kind public.transaction_kind;
begin
  select amount_due, owner_id into v_due, v_receivable_owner
  from public.receivables where id = new.receivable_id for update;
  select owner_id, direction, kind into v_tx_owner, v_direction, v_kind
  from public.financial_transactions where id = new.transaction_id;

  if v_receivable_owner is distinct from v_tx_owner then raise exception 'allocation owner mismatch'; end if;
  if v_direction <> 'inflow' or v_kind <> 'income' then raise exception 'receivable requires income inflow'; end if;

  select coalesce(sum(amount), 0) into v_allocated
  from public.receivable_allocations
  where receivable_id = new.receivable_id and id is distinct from new.id;

  if v_allocated + new.amount > v_due then raise exception 'allocation exceeds amount due'; end if;
  return new;
end;
$$;

create trigger validate_receivable_allocation_before
before insert or update on public.receivable_allocations
for each row execute function public.validate_receivable_allocation();

create or replace function public.refresh_receivable_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.receivable_id, old.receivable_id);
  v_due bigint;
  v_paid bigint;
begin
  select amount_due into v_due from public.receivables where id = v_id;
  select coalesce(sum(amount), 0) into v_paid
  from public.receivable_allocations where receivable_id = v_id;
  update public.receivables
  set status = case
      when status = 'void' then 'void'::public.receivable_status
      when v_paid = 0 then 'open'::public.receivable_status
      when v_paid < v_due then 'partially_paid'::public.receivable_status
      else 'paid'::public.receivable_status
    end,
    updated_at = now()
  where id = v_id;
  return coalesce(new, old);
end;
$$;

create trigger refresh_receivable_after_allocation
after insert or update or delete on public.receivable_allocations
for each row execute function public.refresh_receivable_status();

create or replace function public.validate_subscription_split_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.subscription_id, old.subscription_id);
  v_scope public.record_scope;
  v_total integer;
begin
  select scope into v_scope from public.subscriptions where id = v_id;
  if v_scope = 'household' then
    select coalesce(sum(share_basis_points), 0) into v_total
    from public.subscription_splits where subscription_id = v_id;
    if v_total <> 10000 then
      raise exception 'household subscription split must equal 10000 basis points';
    end if;
  end if;
  return null;
end;
$$;
create constraint trigger subscription_split_total_check
  after insert or update or delete on public.subscription_splits
  deferrable initially deferred
  for each row execute function public.validate_subscription_split_total();

create or replace function public.validate_shared_expense_split_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.shared_expense_id, old.shared_expense_id);
  v_amount bigint;
  v_total bigint;
begin
  select amount into v_amount from public.shared_expenses where id = v_id;
  select coalesce(sum(amount), 0) into v_total
  from public.shared_expense_splits where shared_expense_id = v_id;
  if v_amount is not null and v_total <> v_amount then
    raise exception 'shared expense split must allocate every KRW: expected %, got %', v_amount, v_total;
  end if;
  return null;
end;
$$;
create constraint trigger shared_expense_split_total_check
  after insert or update or delete on public.shared_expense_splits
  deferrable initially deferred
  for each row execute function public.validate_shared_expense_split_total();

-- Create the one-and-only shared expense for a household subscription occurrence.
create or replace function public.ensure_household_subscription_expense(p_occurrence_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_occ public.subscription_occurrences;
  v_sub public.subscriptions;
  v_expense_id uuid;
  v_remaining bigint;
  v_rows integer;
begin
  select * into v_occ from public.subscription_occurrences where id = p_occurrence_id for update;
  if not found then raise exception 'occurrence not found'; end if;

  select * into v_sub from public.subscriptions
  where id = v_occ.subscription_id and owner_id = auth.uid();
  if not found or v_sub.scope <> 'household' then
    raise exception 'not an owned household subscription';
  end if;
  if v_occ.shared_expense_id is not null then return v_occ.shared_expense_id; end if;

  insert into public.shared_expenses(
    household_id, created_by, payer_member_id, source_subscription_occurrence_id,
    category, description, amount, incurred_on, due_on, status
  ) values (
    v_sub.household_id, auth.uid(), v_sub.payer_member_id, v_occ.id,
    'subscription', v_sub.name, v_occ.expected_amount, v_occ.due_on, v_occ.due_on, 'confirmed'
  )
  on conflict (source_subscription_occurrence_id) do update
    set amount = excluded.amount, due_on = excluded.due_on, updated_at = now()
  returning id into v_expense_id;

  delete from public.shared_expense_splits where shared_expense_id = v_expense_id;
  insert into public.shared_expense_splits(shared_expense_id, member_id, amount)
  select v_expense_id, ss.member_id,
         floor(v_occ.expected_amount * ss.share_basis_points / 10000.0)::bigint
  from public.subscription_splits ss
  where ss.subscription_id = v_sub.id
  order by ss.member_id;

  select count(*), v_occ.expected_amount - coalesce(sum(amount), 0)
  into v_rows, v_remaining
  from public.shared_expense_splits where shared_expense_id = v_expense_id;
  if v_rows = 0 then raise exception 'household subscription requires splits'; end if;

  if v_remaining <> 0 then
    update public.shared_expense_splits
    set amount = amount + v_remaining
    where id = (
      select id from public.shared_expense_splits
      where shared_expense_id = v_expense_id
      order by member_id limit 1
    );
  end if;

  update public.subscription_occurrences
  set shared_expense_id = v_expense_id
  where id = v_occ.id;
  return v_expense_id;
end;
$$;

-- Record an own-account transfer as two linked legs. It never becomes income/expense.
create or replace function public.record_internal_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount bigint,
  p_occurred_at timestamptz,
  p_memo text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group uuid := gen_random_uuid();
  v_owner uuid := auth.uid();
begin
  if p_amount <= 0 or p_from_account = p_to_account then raise exception 'invalid transfer'; end if;
  if not exists(select 1 from public.accounts where id = p_from_account and owner_id = v_owner)
     or not exists(select 1 from public.accounts where id = p_to_account and owner_id = v_owner) then
    raise exception 'account not found or forbidden';
  end if;

  insert into public.financial_transactions(
    owner_id, account_id, scope, direction, kind, amount, occurred_at,
    source, transfer_group_id, memo
  ) values
    (v_owner, p_from_account, 'private', 'outflow', 'transfer', p_amount,
     p_occurred_at, 'manual', v_group, p_memo),
    (v_owner, p_to_account, 'private', 'inflow', 'transfer', p_amount,
     p_occurred_at, 'manual', v_group, p_memo);
  return v_group;
end;
$$;

create or replace function public.complete_cleaning_task(
  p_task_id uuid,
  p_member_id uuid,
  p_note text default null
)
returns public.cleaning_tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task public.cleaning_tasks;
  v_done_at timestamptz := now();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_diff integer;
  v_next date;
begin
  select * into v_task from public.cleaning_tasks
  where id = p_task_id and public.is_household_member(household_id)
  for update;
  if not found then raise exception 'task not found or forbidden'; end if;
  if not public.member_belongs_to_household(p_member_id, v_task.household_id) then
    raise exception 'member mismatch';
  end if;

  insert into public.cleaning_completions(task_id, completed_by_member_id, completed_at, note)
  values (p_task_id, p_member_id, v_done_at, p_note);

  if v_task.recurrence = 'interval_days' then
    v_next := v_today + v_task.recurrence_interval_days;
  elsif v_task.recurrence = 'weekly' then
    v_diff := (v_task.weekday - extract(dow from v_today)::integer + 7) % 7;
    if v_diff = 0 then v_diff := 7; end if;
    v_next := v_today + v_diff;
  else
    v_next := null;
  end if;

  update public.cleaning_tasks
  set last_completed_at = v_done_at, next_due_on = v_next
  where id = p_task_id
  returning * into v_task;
  return v_task;
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
    when 'custom_days' then p_amount::numeric * 365 / (p_custom_days * 12)
  end;
$$;

create or replace view public.v_receivable_balances
with (security_invoker = true)
as
select
  r.*,
  coalesce(sum(ra.amount), 0)::bigint as amount_paid,
  (r.amount_due - coalesce(sum(ra.amount), 0))::bigint as amount_remaining
from public.receivables r
left join public.receivable_allocations ra on ra.receivable_id = r.id
group by r.id;

create or replace view public.v_lesson_income_metrics
with (security_invoker = true)
as
select
  l.id,
  l.owner_id,
  l.student_id,
  l.amount,
  extract(epoch from (l.ends_at - l.starts_at)) / 60 as lesson_minutes,
  l.prep_minutes,
  l.travel_minutes,
  round(l.amount::numeric / nullif(extract(epoch from (l.ends_at - l.starts_at)) / 3600, 0), 0) as nominal_hourly_krw,
  round(l.amount::numeric / nullif((extract(epoch from (l.ends_at - l.starts_at)) / 60 + l.prep_minutes + l.travel_minutes) / 60, 0), 0) as effective_hourly_krw
from public.lessons l;

create or replace view public.v_subscription_overview
with (security_invoker = true)
as
select
  s.*,
  round(public.subscription_monthly_equivalent(s.amount, s.billing_cycle, s.custom_cycle_days), 0)::bigint as monthly_equivalent_krw,
  round(public.subscription_monthly_equivalent(s.amount, s.billing_cycle, s.custom_cycle_days) * 12, 0)::bigint as annual_projection_krw,
  case
    when s.cancel_by_on is not null and s.cancel_by_on <= current_date + 7 then 'cancel_by_soon'
    when s.trial_ends_on is not null and s.trial_ends_on <= current_date + 7 then 'trial_ending'
    when s.next_billing_on is not null and s.next_billing_on <= current_date + 7 then 'due_7d'
    when s.next_billing_on is not null and s.next_billing_on <= current_date + 30 then 'due_30d'
    else 'normal'
  end as attention_state
from public.subscriptions s;

create or replace view public.v_cleaning_task_status
with (security_invoker = true)
as
select
  ct.*,
  case
    when ct.next_due_on is null then 'ok'
    when ct.next_due_on < current_date then 'due'
    when ct.next_due_on <= current_date + ct.due_soon_days then 'due_soon'
    else 'ok'
  end as derived_status
from public.cleaning_tasks ct;

create or replace view public.v_household_member_balances
with (security_invoker = true)
as
select
  se.household_id,
  ses.member_id,
  sum(ses.amount)::bigint as responsibility_amount,
  sum(case when se.payer_member_id = ses.member_id then se.amount else 0 end)::bigint as paid_amount,
  (sum(case when se.payer_member_id = ses.member_id then se.amount else 0 end)
   - sum(ses.amount))::bigint as net_credit_before_settlement
from public.shared_expenses se
join public.shared_expense_splits ses on ses.shared_expense_id = se.id
where se.status in ('confirmed', 'settled')
group by se.household_id, ses.member_id;

-- Economic available surplus; intentionally separate from current account liquidity.
create or replace function public.available_surplus(p_owner_id uuid, p_month date)
returns table (
  settled_cash_income bigint,
  private_expenses bigint,
  household_responsibility bigint,
  unpaid_private_subscriptions bigint,
  safety_reserve_topup bigint,
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
  from public.household_members
  where user_id = p_owner_id and status = 'active';

  select coalesce(sum(ft.amount), 0)::bigint into settled_cash_income
  from public.financial_transactions ft
  where ft.owner_id = p_owner_id
    and ft.kind = 'income' and ft.direction = 'inflow'
    and (ft.occurred_at at time zone 'Asia/Seoul')::date >= v_start
    and (ft.occurred_at at time zone 'Asia/Seoul')::date < v_end;

  select coalesce(sum(ft.amount), 0)::bigint into private_expenses
  from public.financial_transactions ft
  where ft.owner_id = p_owner_id
    and ft.kind = 'expense' and ft.direction = 'outflow'
    and ft.scope = 'private'
    and (ft.occurred_at at time zone 'Asia/Seoul')::date >= v_start
    and (ft.occurred_at at time zone 'Asia/Seoul')::date < v_end;

  select coalesce(sum(ses.amount), 0)::bigint into household_responsibility
  from public.shared_expense_splits ses
  join public.shared_expenses se on se.id = ses.shared_expense_id
  where ses.member_id = any(v_member_ids)
    and se.status in ('confirmed', 'settled')
    and se.incurred_on >= v_start and se.incurred_on < v_end;

  -- Household subscriptions are excluded here because their one shared-expense bridge
  -- is already included in household responsibility.
  select coalesce(sum(so.expected_amount), 0)::bigint into unpaid_private_subscriptions
  from public.subscription_occurrences so
  join public.subscriptions s on s.id = so.subscription_id
  where s.owner_id = p_owner_id and s.scope = 'private'
    and so.due_on >= v_start and so.due_on < v_end
    and so.status in ('scheduled', 'unmatched')
    and so.matched_transaction_id is null;

  select gp.safety_reserve_target, coalesce(a.current_balance, 0)
  into v_reserve_target, v_reserve_balance
  from public.grow_plans gp
  left join public.accounts a on a.id = gp.reserve_account_id
  where gp.owner_id = p_owner_id and gp.is_active
  limit 1;

  safety_reserve_topup := greatest(coalesce(v_reserve_target, 0) - coalesce(v_reserve_balance, 0), 0);
  available_surplus := settled_cash_income - private_expenses - household_responsibility
                       - unpaid_private_subscriptions - safety_reserve_topup;
  return next;
end;
$$;

-- Apply updated_at to mutable tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','households','household_members','external_connections','students',
    'tutoring_schedules','lessons','lesson_prep_items','receivables','accounts',
    'financial_transactions','subscriptions','subscription_occurrences','shared_expenses',
    'shared_expense_splits','settlements','inventory_items','shopping_items','cleaning_tasks',
    'grow_plans','investment_contributions','match_suggestions'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || t || '_updated_at', t);
  end loop;
end $$;

-- RLS enablement.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','households','household_members','external_connections','sync_runs','students',
    'tutoring_schedules','lessons','lesson_prep_items','receivables','accounts',
    'transaction_categories','financial_transactions','receivable_allocations','subscriptions',
    'subscription_splits','subscription_price_history','subscription_occurrences','shared_expenses',
    'shared_expense_splits','settlements','inventory_items','shopping_items','cleaning_tasks',
    'cleaning_completions','grow_plans','investment_contributions','match_suggestions','audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Profiles.
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Household boundary.
create policy households_select_member on public.households for select
  using (public.is_household_member(id));
create policy households_insert_creator on public.households for insert
  with check (created_by = auth.uid());
create policy households_update_owner on public.households for update
  using (public.is_household_owner(id)) with check (public.is_household_owner(id));
create policy households_delete_owner on public.households for delete
  using (public.is_household_owner(id));

create policy household_members_select_member on public.household_members for select
  using (public.is_household_member(household_id));
create policy household_members_insert_owner_or_creator on public.household_members for insert
  with check (public.is_household_owner(household_id) or public.is_household_creator(household_id));
create policy household_members_update_owner on public.household_members for update
  using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));
create policy household_members_delete_owner on public.household_members for delete
  using (public.is_household_owner(household_id));

-- Owner-only records.
create policy external_connections_owner_all on public.external_connections for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sync_runs_owner_all on public.sync_runs for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy students_owner_all on public.students for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy tutoring_schedules_owner_all on public.tutoring_schedules for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy lessons_owner_all on public.lessons for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy lesson_prep_items_owner_all on public.lesson_prep_items for all
  using (exists(select 1 from public.lessons l where l.id = lesson_id and l.owner_id = auth.uid()))
  with check (exists(select 1 from public.lessons l where l.id = lesson_id and l.owner_id = auth.uid()));
create policy receivables_owner_all on public.receivables for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy accounts_owner_all on public.accounts for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy financial_transactions_owner_all on public.financial_transactions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy receivable_allocations_owner_all on public.receivable_allocations for all
  using (exists(select 1 from public.receivables r where r.id = receivable_id and r.owner_id = auth.uid()))
  with check (exists(select 1 from public.receivables r where r.id = receivable_id and r.owner_id = auth.uid()));
create policy grow_plans_owner_all on public.grow_plans for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy investment_contributions_owner_all on public.investment_contributions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy match_suggestions_owner_all on public.match_suggestions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- System categories are readable; custom categories are owner-only.
create policy transaction_categories_select on public.transaction_categories for select
  using (owner_id is null or owner_id = auth.uid());
create policy transaction_categories_insert on public.transaction_categories for insert
  with check (owner_id = auth.uid());
create policy transaction_categories_update on public.transaction_categories for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy transaction_categories_delete on public.transaction_categories for delete
  using (owner_id = auth.uid());

-- Subscription owner writes; active household members can read shared subscriptions.
create policy subscriptions_select on public.subscriptions for select using (
  owner_id = auth.uid() or (scope = 'household' and public.is_household_member(household_id))
);
create policy subscriptions_insert_owner on public.subscriptions for insert with check (owner_id = auth.uid());
create policy subscriptions_update_owner on public.subscriptions for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy subscriptions_delete_owner on public.subscriptions for delete using (owner_id = auth.uid());

create policy subscription_splits_select on public.subscription_splits for select using (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and
    (s.owner_id = auth.uid() or (s.scope = 'household' and public.is_household_member(s.household_id))))
);
create policy subscription_splits_write on public.subscription_splits for all using (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and s.owner_id = auth.uid())
) with check (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and s.owner_id = auth.uid())
);
create policy subscription_price_history_select on public.subscription_price_history for select using (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and
    (s.owner_id = auth.uid() or (s.scope = 'household' and public.is_household_member(s.household_id))))
);
create policy subscription_price_history_write on public.subscription_price_history for all using (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and s.owner_id = auth.uid())
) with check (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and s.owner_id = auth.uid())
);
create policy subscription_occurrences_select on public.subscription_occurrences for select using (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and
    (s.owner_id = auth.uid() or (s.scope = 'household' and public.is_household_member(s.household_id))))
);
create policy subscription_occurrences_write on public.subscription_occurrences for all using (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and s.owner_id = auth.uid())
) with check (
  exists(select 1 from public.subscriptions s where s.id = subscription_id and s.owner_id = auth.uid())
);

-- Shared household operational records.
create policy shared_expenses_member_all on public.shared_expenses for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy shared_expense_splits_member_all on public.shared_expense_splits for all
  using (exists(select 1 from public.shared_expenses se where se.id = shared_expense_id and public.is_household_member(se.household_id)))
  with check (exists(select 1 from public.shared_expenses se where se.id = shared_expense_id and public.is_household_member(se.household_id)));
create policy settlements_member_all on public.settlements for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy inventory_items_member_all on public.inventory_items for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy shopping_items_member_all on public.shopping_items for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy cleaning_tasks_member_all on public.cleaning_tasks for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy cleaning_completions_member_all on public.cleaning_completions for all
  using (exists(select 1 from public.cleaning_tasks ct where ct.id = task_id and public.is_household_member(ct.household_id)))
  with check (exists(select 1 from public.cleaning_tasks ct where ct.id = task_id and public.is_household_member(ct.household_id)));

create policy audit_events_select_relevant on public.audit_events for select using (
  owner_id = auth.uid() or (household_id is not null and public.is_household_member(household_id))
);
create policy audit_events_insert_relevant on public.audit_events for insert with check (
  actor_id = auth.uid()
  and (owner_id = auth.uid() or (household_id is not null and public.is_household_member(household_id)))
);

-- Basic grants. RLS remains authoritative.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
