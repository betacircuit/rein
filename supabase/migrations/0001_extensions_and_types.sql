-- Student OS migration 0001: extensions and domain enums
-- Amounts are integer KRW stored as bigint. Never use floating-point for money.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.household_role as enum ('owner', 'member');
create type public.household_member_status as enum ('invited', 'active', 'left');
create type public.record_scope as enum ('private', 'household');

create type public.tutoring_type as enum ('subject', 'school_record');
create type public.tutoring_subject as enum ('math', 'physics', 'chemistry');
create type public.lesson_mode as enum ('online', 'in_person');
create type public.lesson_status as enum ('scheduled', 'completed', 'cancelled');
create type public.meet_strategy as enum ('google_generated', 'manual_reusable', 'none');
create type public.receivable_status as enum ('open', 'partially_paid', 'paid', 'void');

create type public.account_type as enum ('checking', 'savings', 'cash', 'investment', 'other');
create type public.transaction_direction as enum ('inflow', 'outflow');
create type public.transaction_kind as enum ('income', 'expense', 'transfer');
create type public.transaction_source as enum ('manual', 'mock_sync', 'manual_csv', 'bank_sync', 'system');
create type public.category_kind as enum ('income', 'expense');
create type public.bank_provider as enum ('mock', 'manual_csv', 'kftc_testbed', 'kftc_production');
create type public.connection_kind as enum ('google_calendar', 'bank');
create type public.connection_status as enum ('disconnected', 'pending', 'connected', 'error', 'revoked');
create type public.sync_status as enum ('running', 'succeeded', 'failed', 'partial');

create type public.subscription_status as enum ('trial', 'active', 'paused', 'cancelled', 'ended');
create type public.subscription_category as enum (
  'ai_software', 'cloud_storage', 'education', 'entertainment',
  'communication', 'fitness', 'news', 'other'
);
create type public.billing_cycle as enum ('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'custom_days');
create type public.subscription_occurrence_status as enum ('scheduled', 'unmatched', 'paid', 'skipped', 'refunded');
create type public.subscription_decision as enum ('keep', 'review', 'cancel_candidate');

create type public.inventory_owner_kind as enum ('member', 'shared');
create type public.storage_location as enum ('refrigerated', 'frozen', 'room_temperature');
create type public.shopping_status as enum ('needed', 'purchased', 'dismissed');
create type public.cleaning_recurrence as enum ('none', 'interval_days', 'weekly');

create type public.shared_expense_category as enum (
  'rent', 'management_fee', 'electricity', 'gas', 'water', 'internet',
  'household_goods', 'shared_grocery', 'subscription', 'other'
);
create type public.shared_expense_status as enum ('draft', 'confirmed', 'settled', 'void');
create type public.settlement_status as enum ('open', 'partially_paid', 'paid', 'void');

create type public.grow_rule_kind as enum ('fixed_amount', 'percentage');
create type public.contribution_status as enum ('planned', 'completed', 'skipped');
create type public.match_target_kind as enum ('receivable', 'subscription_occurrence', 'shared_expense', 'settlement');
create type public.match_status as enum ('suggested', 'confirmed', 'dismissed', 'superseded');
create type public.audit_action as enum ('create', 'update', 'delete', 'link', 'unlink', 'confirm', 'cancel', 'complete', 'sync');
