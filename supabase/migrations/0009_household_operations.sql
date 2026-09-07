-- Phase 05: atomic inventory adjustments, idempotent shopping linkage,
-- append-only cleaning completion, and same-household member references.

alter table public.inventory_items
  add column quantity_version bigint not null default 0 check (quantity_version >= 0);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  actor_member_id uuid references public.household_members(id) on delete set null,
  idempotency_key text not null,
  delta numeric(12,3) not null check (delta <> 0),
  quantity_before numeric(12,3) not null check (quantity_before >= 0),
  quantity_after numeric(12,3) not null check (quantity_after >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, idempotency_key)
);
create index inventory_adjustments_item_created_idx
  on public.inventory_adjustments(inventory_item_id, created_at desc);

alter table public.inventory_adjustments enable row level security;

create policy inventory_adjustments_member_select on public.inventory_adjustments for select
  using (public.is_household_member(household_id));

-- Quantity and its version can only move together through the atomic RPC. Members
-- retain normal metadata editing through explicit column privileges.
revoke update on public.inventory_items from authenticated;
grant update (
  name, unit, owner_kind, owner_member_id, storage_location,
  expires_on, low_stock_threshold, notes, updated_at
) on public.inventory_items to authenticated;
grant select on public.inventory_adjustments to authenticated;

create or replace function public.validate_household_operation_relations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inventory_household uuid;
begin
  if tg_table_name = 'inventory_items' then
    if new.owner_kind = 'member'
       and not public.member_belongs_to_household(new.owner_member_id, new.household_id) then
      raise exception 'inventory owner member mismatch';
    end if;
  elsif tg_table_name = 'shopping_items' then
    if new.requested_by_member_id is not null
       and not public.member_belongs_to_household(new.requested_by_member_id, new.household_id) then
      raise exception 'shopping requester member mismatch';
    end if;
    if new.requested_by_member_id is not null and not exists (
      select 1 from public.household_members hm
      where hm.id = new.requested_by_member_id
        and hm.household_id = new.household_id
        and hm.user_id = auth.uid()
        and hm.status = 'active'
    ) then
      raise exception 'shopping requester must be current actor';
    end if;
    if new.owner_kind = 'member'
       and not public.member_belongs_to_household(new.owner_member_id, new.household_id) then
      raise exception 'shopping owner member mismatch';
    end if;
    if new.inventory_item_id is not null then
      select household_id into v_inventory_household
      from public.inventory_items where id = new.inventory_item_id;
      if v_inventory_household is distinct from new.household_id then
        raise exception 'shopping inventory household mismatch';
      end if;
    end if;
  elsif tg_table_name = 'cleaning_tasks' then
    if new.assignee_member_id is not null
       and not public.member_belongs_to_household(new.assignee_member_id, new.household_id) then
      raise exception 'cleaning assignee member mismatch';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_inventory_household_relations
before insert or update on public.inventory_items
for each row execute function public.validate_household_operation_relations();

create trigger validate_shopping_household_relations
before insert or update on public.shopping_items
for each row execute function public.validate_household_operation_relations();

create trigger validate_cleaning_household_relations
before insert or update on public.cleaning_tasks
for each row execute function public.validate_household_operation_relations();

create or replace function public.adjust_inventory_quantity(
  p_inventory_item_id uuid,
  p_actor_member_id uuid,
  p_delta numeric,
  p_expected_version bigint,
  p_idempotency_key text
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items;
  v_prior public.inventory_adjustments;
  v_after numeric(12,3);
begin
  if p_delta = 0 then raise exception 'inventory delta cannot be zero'; end if;
  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'inventory idempotency key is required';
  end if;

  select * into v_item from public.inventory_items
  where id = p_inventory_item_id
  for update;
  if not found or not public.is_household_member(v_item.household_id) then
    raise exception 'inventory item not found or forbidden';
  end if;
  if not public.member_belongs_to_household(p_actor_member_id, v_item.household_id) then
    raise exception 'inventory actor member mismatch';
  end if;
  if not exists (
    select 1 from public.household_members hm
    where hm.id = p_actor_member_id
      and hm.household_id = v_item.household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  ) then
    raise exception 'inventory actor must match current user';
  end if;

  select * into v_prior from public.inventory_adjustments
    where household_id = v_item.household_id and idempotency_key = p_idempotency_key
  ;
  if found then
    if v_prior.inventory_item_id is distinct from v_item.id
       or v_prior.delta is distinct from p_delta then
      raise exception 'inventory idempotency key conflict';
    end if;
    return v_item;
  end if;
  if v_item.quantity_version <> p_expected_version then
    raise exception 'inventory version conflict';
  end if;

  v_after := v_item.quantity + p_delta;
  if v_after < 0 then raise exception 'inventory quantity cannot become negative'; end if;

  insert into public.inventory_adjustments(
    household_id, inventory_item_id, actor_member_id, idempotency_key,
    delta, quantity_before, quantity_after
  ) values (
    v_item.household_id, v_item.id, p_actor_member_id, p_idempotency_key,
    p_delta, v_item.quantity, v_after
  );

  update public.inventory_items
  set quantity = v_after,
      quantity_version = quantity_version + 1,
      updated_at = now()
  where id = v_item.id
  returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.ensure_low_stock_shopping_item(
  p_inventory_item_id uuid,
  p_requested_by_member_id uuid
)
returns public.shopping_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inventory public.inventory_items;
  v_shopping public.shopping_items;
begin
  select * into v_inventory from public.inventory_items
  where id = p_inventory_item_id
  for update;
  if not found or not public.is_household_member(v_inventory.household_id) then
    raise exception 'inventory item not found or forbidden';
  end if;
  if not public.member_belongs_to_household(p_requested_by_member_id, v_inventory.household_id) then
    raise exception 'shopping requester member mismatch';
  end if;
  if not exists (
    select 1 from public.household_members hm
    where hm.id = p_requested_by_member_id
      and hm.household_id = v_inventory.household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  ) then
    raise exception 'shopping requester must match current user';
  end if;
  if v_inventory.low_stock_threshold is null
     or v_inventory.quantity > v_inventory.low_stock_threshold then
    raise exception 'inventory item is not low stock';
  end if;

  select * into v_shopping from public.shopping_items
  where household_id = v_inventory.household_id
    and inventory_item_id = v_inventory.id
    and status = 'needed';
  if found then return v_shopping; end if;

  insert into public.shopping_items(
    household_id, inventory_item_id, requested_by_member_id,
    owner_kind, owner_member_id, name, desired_quantity, unit, status
  ) values (
    v_inventory.household_id, v_inventory.id, p_requested_by_member_id,
    v_inventory.owner_kind, v_inventory.owner_member_id, v_inventory.name,
    greatest(coalesce(v_inventory.low_stock_threshold, 1), 0.001),
    v_inventory.unit, 'needed'
  ) returning * into v_shopping;
  return v_shopping;
end;
$$;

alter table public.cleaning_completions
  add column idempotency_key text;
create unique index cleaning_completion_idempotency_unique
  on public.cleaning_completions(task_id, idempotency_key)
  where idempotency_key is not null;

drop policy cleaning_completions_member_all on public.cleaning_completions;
create policy cleaning_completions_member_select on public.cleaning_completions for select
  using (
    exists (
      select 1 from public.cleaning_tasks ct
      where ct.id = task_id and public.is_household_member(ct.household_id)
    )
  );
revoke insert, update, delete on public.cleaning_completions from authenticated;

drop function public.complete_cleaning_task(uuid, uuid, text);
create function public.complete_cleaning_task(
  p_task_id uuid,
  p_member_id uuid,
  p_note text default null,
  p_idempotency_key text default null
)
returns public.cleaning_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.cleaning_tasks;
  v_done_at timestamptz := now();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_diff integer;
  v_next date;
begin
  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'cleaning idempotency key is required';
  end if;
  select * into v_task from public.cleaning_tasks
  where id = p_task_id
  for update;
  if not found or not public.is_household_member(v_task.household_id) then
    raise exception 'task not found or forbidden';
  end if;
  if not public.member_belongs_to_household(p_member_id, v_task.household_id) then
    raise exception 'member mismatch';
  end if;
  if not exists (
    select 1 from public.household_members hm
    where hm.id = p_member_id
      and hm.household_id = v_task.household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  ) then
    raise exception 'cleaning member must match current user';
  end if;
  if not v_task.is_active then raise exception 'cleaning task is inactive'; end if;

  if exists (
    select 1 from public.cleaning_completions
    where task_id = p_task_id and idempotency_key = p_idempotency_key
  ) then
    return v_task;
  end if;

  insert into public.cleaning_completions(
    task_id, completed_by_member_id, completed_at, note, idempotency_key
  ) values (p_task_id, p_member_id, v_done_at, p_note, p_idempotency_key);

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
  set last_completed_at = v_done_at,
      next_due_on = v_next,
      is_active = case when recurrence = 'none' then false else is_active end,
      updated_at = v_done_at
  where id = p_task_id
  returning * into v_task;
  return v_task;
end;
$$;

create or replace view public.v_cleaning_task_status
with (security_invoker = true)
as
select
  ct.*,
  case
    when not ct.is_active or ct.next_due_on is null then 'ok'
    when ct.next_due_on <= current_date then 'due'
    when ct.next_due_on <= current_date + ct.due_soon_days then 'due_soon'
    else 'ok'
  end as derived_status
from public.cleaning_tasks ct;

revoke all on function public.adjust_inventory_quantity(uuid, uuid, numeric, bigint, text)
  from public, anon;
revoke all on function public.ensure_low_stock_shopping_item(uuid, uuid)
  from public, anon;
revoke all on function public.complete_cleaning_task(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.adjust_inventory_quantity(uuid, uuid, numeric, bigint, text)
  to authenticated;
grant execute on function public.ensure_low_stock_shopping_item(uuid, uuid)
  to authenticated;
grant execute on function public.complete_cleaning_task(uuid, uuid, text, text)
  to authenticated;
