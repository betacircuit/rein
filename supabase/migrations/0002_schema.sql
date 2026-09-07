-- Student OS migration 0002: relational schema

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  school text,
  major text,
  academic_year smallint check (academic_year is null or academic_year between 1 and 12),
  locale text not null default 'ko-KR',
  currency char(3) not null default 'KRW',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  home_type text not null default 'two_room_rental',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  role public.household_role not null default 'member',
  status public.household_member_status not null default 'invited',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and joined_at is not null) or status <> 'active'),
  check ((status = 'left' and left_at is not null) or status <> 'left')
);
create unique index household_members_one_user_per_household
  on public.household_members(household_id, user_id)
  where user_id is not null and status <> 'left';

create table public.external_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind public.connection_kind not null,
  provider text not null,
  status public.connection_status not null default 'disconnected',
  external_subject text,
  scopes text[] not null default '{}',
  secret_reference text,
  metadata jsonb not null default '{}'::jsonb,
  last_connected_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, kind, provider),
  check (secret_reference is null or length(secret_reference) <= 512)
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.external_connections(id) on delete cascade,
  status public.sync_status not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  cursor_before text,
  cursor_after text,
  imported_count integer not null default 0 check (imported_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_code text,
  redacted_error text,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  tutoring_type public.tutoring_type not null,
  subject public.tutoring_subject,
  default_mode public.lesson_mode not null,
  default_fee_amount bigint not null check (default_fee_amount > 0),
  default_duration_minutes integer not null check (default_duration_minutes between 15 and 600),
  default_location text,
  meet_strategy public.meet_strategy not null default 'google_generated',
  manual_meet_url text,
  payer_aliases text[] not null default '{}',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (tutoring_type = 'subject' and subject is not null)
    or (tutoring_type = 'school_record' and subject is null)
  ),
  check (default_mode <> 'in_person' or nullif(trim(default_location), '') is not null),
  check (meet_strategy <> 'manual_reusable' or nullif(trim(manual_meet_url), '') is not null)
);

create table public.tutoring_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 600),
  timezone text not null default 'Asia/Seoul',
  effective_from date not null,
  effective_until date,
  mode_override public.lesson_mode,
  location_override text,
  meet_strategy_override public.meet_strategy,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until >= effective_from),
  check (mode_override <> 'in_person' or nullif(trim(location_override), '') is not null)
);
create unique index tutoring_schedules_natural_key
  on public.tutoring_schedules(student_id, weekday, start_time, effective_from)
  where is_active;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  schedule_id uuid references public.tutoring_schedules(id) on delete set null,
  occurrence_key text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Seoul',
  status public.lesson_status not null default 'scheduled',
  mode public.lesson_mode not null,
  amount bigint not null check (amount > 0),
  prep_notes text,
  in_person_location text,
  meet_strategy public.meet_strategy not null default 'none',
  meet_url text,
  google_calendar_event_id text,
  google_calendar_html_url text,
  calendar_sync_state text not null default 'not_synced',
  calendar_last_error text,
  prep_minutes integer not null default 0 check (prep_minutes between 0 and 1440),
  travel_minutes integer not null default 0 check (travel_minutes between 0 and 1440),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (mode <> 'in_person' or nullif(trim(in_person_location), '') is not null),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed'),
  check ((status = 'cancelled' and cancelled_at is not null) or status <> 'cancelled')
);
create unique index lessons_occurrence_key_unique
  on public.lessons(owner_id, occurrence_key)
  where occurrence_key is not null;
create index lessons_owner_start_idx on public.lessons(owner_id, starts_at);

create table public.lesson_prep_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  amount_due bigint not null check (amount_due > 0),
  due_date date,
  status public.receivable_status not null default 'open',
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'void' and nullif(trim(void_reason), '') is not null) or status <> 'void')
);
create index receivables_owner_status_idx on public.receivables(owner_id, status, due_date);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  institution_name text not null,
  nickname text not null,
  account_type public.account_type not null,
  masked_account_number text,
  provider public.bank_provider not null default 'mock',
  external_account_reference text,
  currency char(3) not null default 'KRW',
  current_balance bigint not null default 0,
  available_balance bigint,
  balance_as_of timestamptz,
  last_sync_attempt_at timestamptz,
  last_sync_success_at timestamptz,
  last_sync_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (masked_account_number is null or length(masked_account_number) <= 64)
);
create unique index accounts_external_ref_unique
  on public.accounts(owner_id, provider, external_account_reference)
  where external_account_reference is not null;

create table public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  kind public.category_kind not null,
  code text not null,
  display_name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index transaction_categories_unique
  on public.transaction_categories(coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), kind, code);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.transaction_categories(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  scope public.record_scope not null default 'private',
  direction public.transaction_direction not null,
  kind public.transaction_kind not null,
  amount bigint not null check (amount > 0),
  currency char(3) not null default 'KRW',
  occurred_at timestamptz not null,
  booked_at timestamptz,
  counterparty text,
  descriptor text,
  memo text,
  balance_after bigint,
  source public.transaction_source not null default 'manual',
  external_transaction_id text,
  import_fingerprint text,
  transfer_group_id uuid,
  raw_payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'income' and direction = 'inflow')
    or (kind = 'expense' and direction = 'outflow')
    or kind = 'transfer'
  ),
  check (
    (scope = 'household' and household_id is not null)
    or (scope = 'private' and household_id is null)
  ),
  check (kind <> 'transfer' or transfer_group_id is not null)
);
create unique index financial_transactions_external_unique
  on public.financial_transactions(account_id, external_transaction_id)
  where external_transaction_id is not null;
create unique index financial_transactions_fingerprint_unique
  on public.financial_transactions(account_id, import_fingerprint)
  where import_fingerprint is not null;
create index financial_transactions_owner_time_idx
  on public.financial_transactions(owner_id, occurred_at desc);
create index financial_transactions_transfer_idx
  on public.financial_transactions(transfer_group_id)
  where transfer_group_id is not null;

create table public.receivable_allocations (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
  amount bigint not null check (amount > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(receivable_id, transaction_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  scope public.record_scope not null default 'private',
  payer_member_id uuid references public.household_members(id) on delete set null,
  payment_account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  provider_name text,
  plan_name text,
  category public.subscription_category not null default 'other',
  status public.subscription_status not null default 'active',
  decision public.subscription_decision not null default 'keep',
  amount bigint not null check (amount > 0),
  currency char(3) not null default 'KRW',
  billing_cycle public.billing_cycle not null,
  custom_cycle_days integer,
  started_on date,
  billing_anchor_on date not null,
  next_billing_on date,
  trial_ends_on date,
  cancel_by_on date,
  auto_renews boolean not null default true,
  descriptor_aliases text[] not null default '{}',
  reminder_days_before integer[] not null default '{7,1}',
  service_url text,
  notes text,
  last_used_on date,
  cancelled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (billing_cycle = 'custom_days' and custom_cycle_days is not null and custom_cycle_days > 0)
    or (billing_cycle <> 'custom_days' and custom_cycle_days is null)
  ),
  check (
    (scope = 'household' and household_id is not null and payer_member_id is not null)
    or (scope = 'private' and household_id is null and payer_member_id is null)
  ),
  check ((status = 'cancelled' and cancelled_at is not null) or status <> 'cancelled'),
  check ((status = 'ended' and ended_at is not null) or status <> 'ended')
);
create index subscriptions_owner_next_idx on public.subscriptions(owner_id, next_billing_on);
create index subscriptions_household_idx on public.subscriptions(household_id) where household_id is not null;

create table public.subscription_splits (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  share_basis_points integer not null check (share_basis_points between 0 and 10000),
  created_at timestamptz not null default now(),
  unique(subscription_id, member_id)
);

create table public.subscription_price_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  effective_on date not null,
  amount bigint not null check (amount > 0),
  currency char(3) not null default 'KRW',
  note text,
  created_at timestamptz not null default now(),
  unique(subscription_id, effective_on)
);

create table public.subscription_occurrences (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  due_on date not null,
  expected_amount bigint not null check (expected_amount > 0),
  status public.subscription_occurrence_status not null default 'scheduled',
  matched_transaction_id uuid references public.financial_transactions(id) on delete set null,
  shared_expense_id uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check ((status = 'paid' and matched_transaction_id is not null and paid_at is not null) or status <> 'paid'),
  unique(subscription_id, period_start)
);
create index subscription_occurrences_due_idx on public.subscription_occurrences(due_on, status);

create table public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  payer_member_id uuid not null references public.household_members(id) on delete restrict,
  source_subscription_occurrence_id uuid unique references public.subscription_occurrences(id) on delete set null,
  linked_transaction_id uuid references public.financial_transactions(id) on delete set null,
  category public.shared_expense_category not null,
  description text not null,
  amount bigint not null check (amount > 0),
  incurred_on date not null,
  due_on date,
  status public.shared_expense_status not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shared_expenses_household_month_idx on public.shared_expenses(household_id, incurred_on desc);

alter table public.subscription_occurrences
  add constraint subscription_occurrences_shared_expense_fk
  foreign key (shared_expense_id) references public.shared_expenses(id) on delete set null;
create unique index subscription_occurrences_shared_expense_unique
  on public.subscription_occurrences(shared_expense_id)
  where shared_expense_id is not null;

create table public.shared_expense_splits (
  id uuid primary key default gen_random_uuid(),
  shared_expense_id uuid not null references public.shared_expenses(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shared_expense_id, member_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_member_id uuid not null references public.household_members(id) on delete restrict,
  to_member_id uuid not null references public.household_members(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  amount_due bigint not null check (amount_due > 0),
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  status public.settlement_status not null default 'open',
  matched_transaction_id uuid references public.financial_transactions(id) on delete set null,
  due_on date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_member_id <> to_member_id),
  check (period_end >= period_start),
  check (amount_paid <= amount_due)
);
create index settlements_household_status_idx on public.settlements(household_id, status, due_on);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  unit text not null,
  owner_kind public.inventory_owner_kind not null default 'shared',
  owner_member_id uuid references public.household_members(id) on delete set null,
  storage_location public.storage_location not null,
  expires_on date,
  low_stock_threshold numeric(12,3) check (low_stock_threshold is null or low_stock_threshold >= 0),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (owner_kind = 'member' and owner_member_id is not null)
    or (owner_kind = 'shared' and owner_member_id is null)
  )
);
create index inventory_household_storage_idx on public.inventory_items(household_id, storage_location, name);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  requested_by_member_id uuid references public.household_members(id) on delete set null,
  owner_kind public.inventory_owner_kind not null default 'shared',
  owner_member_id uuid references public.household_members(id) on delete set null,
  name text not null,
  desired_quantity numeric(12,3) check (desired_quantity is null or desired_quantity > 0),
  unit text,
  status public.shopping_status not null default 'needed',
  purchased_transaction_id uuid references public.financial_transactions(id) on delete set null,
  shared_expense_id uuid references public.shared_expenses(id) on delete set null,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (owner_kind = 'member' and owner_member_id is not null)
    or (owner_kind = 'shared' and owner_member_id is null)
  )
);
create unique index shopping_open_inventory_unique
  on public.shopping_items(household_id, inventory_item_id)
  where inventory_item_id is not null and status = 'needed';

create table public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  area text not null,
  assignee_member_id uuid references public.household_members(id) on delete set null,
  recurrence public.cleaning_recurrence not null default 'interval_days',
  recurrence_interval_days integer,
  weekday smallint,
  due_soon_days integer not null default 2 check (due_soon_days between 0 and 30),
  last_completed_at timestamptz,
  next_due_on date,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (recurrence = 'interval_days' and recurrence_interval_days is not null and recurrence_interval_days > 0 and weekday is null)
    or (recurrence = 'weekly' and weekday between 0 and 6 and recurrence_interval_days is null)
    or (recurrence = 'none' and recurrence_interval_days is null and weekday is null)
  )
);
create index cleaning_tasks_household_due_idx on public.cleaning_tasks(household_id, next_due_on);

create table public.cleaning_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.cleaning_tasks(id) on delete cascade,
  completed_by_member_id uuid references public.household_members(id) on delete set null,
  completed_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create table public.grow_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  rule_kind public.grow_rule_kind not null default 'fixed_amount',
  fixed_contribution_amount bigint check (fixed_contribution_amount is null or fixed_contribution_amount >= 0),
  contribution_basis_points integer check (contribution_basis_points is null or contribution_basis_points between 0 and 10000),
  safety_reserve_target bigint not null default 0 check (safety_reserve_target >= 0),
  reserve_account_id uuid references public.accounts(id) on delete set null,
  investment_account_id uuid references public.accounts(id) on delete set null,
  review_day smallint not null default 1 check (review_day between 1 and 28),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (rule_kind = 'fixed_amount' and fixed_contribution_amount is not null and contribution_basis_points is null)
    or (rule_kind = 'percentage' and contribution_basis_points is not null and fixed_contribution_amount is null)
  )
);
create unique index grow_plans_one_active on public.grow_plans(owner_id) where is_active;

create table public.investment_contributions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  grow_plan_id uuid not null references public.grow_plans(id) on delete cascade,
  from_account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  transfer_group_id uuid,
  planned_for date not null,
  amount bigint not null check (amount > 0),
  status public.contribution_status not null default 'planned',
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_account_id is null or to_account_id is null or from_account_id <> to_account_id),
  check ((status = 'completed' and transfer_group_id is not null and completed_at is not null) or status <> 'completed')
);
-- Expression uniqueness is created in migration 0003 after date normalization helper.
create index investment_contributions_owner_plan_idx
  on public.investment_contributions(owner_id, grow_plan_id, planned_for);

create table public.match_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
  target_kind public.match_target_kind not null,
  target_id uuid not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  status public.match_status not null default 'suggested',
  confirmed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(transaction_id, target_kind, target_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (owner_id is not null or household_id is not null)
);
create index audit_events_owner_time_idx on public.audit_events(owner_id, created_at desc);
create index audit_events_household_time_idx on public.audit_events(household_id, created_at desc);
