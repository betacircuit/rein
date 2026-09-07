-- Master rules are the house rules everyone living here has agreed to keep, so
-- members write and edit them directly instead of reading a fixed list.

create table public.household_master_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  detail text check (detail is null or length(trim(detail)) <= 500),
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index household_master_rules_household_order_idx
  on public.household_master_rules(household_id, sort_order, created_at);

alter table public.household_master_rules enable row level security;

create policy household_master_rules_member_select on public.household_master_rules for select
  using (public.is_household_member(household_id));

create policy household_master_rules_member_insert on public.household_master_rules for insert
  with check (public.is_household_member(household_id));

create policy household_master_rules_member_update on public.household_master_rules for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy household_master_rules_member_delete on public.household_master_rules for delete
  using (public.is_household_member(household_id));
