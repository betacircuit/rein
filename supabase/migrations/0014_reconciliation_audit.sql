-- Student OS Phase 09: append an immutable before/after explanation whenever a
-- suggested cross-record match becomes a confirmed reconciliation decision.

create or replace function public.audit_confirmed_match_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_household_id uuid;
begin
  if old.status = 'confirmed' or new.status <> 'confirmed' then return new; end if;
  if v_actor_id is null then raise exception 'reconciliation actor must be authenticated'; end if;

  if new.target_kind = 'subscription_occurrence' then
    select subscription.household_id into v_household_id
    from public.subscription_occurrences occurrence
    join public.subscriptions subscription on subscription.id = occurrence.subscription_id
    where occurrence.id = new.target_id;
  elsif new.target_kind = 'shared_expense' then
    select household_id into v_household_id
    from public.shared_expenses
    where id = new.target_id;
  elsif new.target_kind = 'settlement' then
    select household_id into v_household_id
    from public.settlements
    where id = new.target_id;
  end if;

  insert into public.audit_events(
    owner_id, household_id, actor_id, action, entity_type, entity_id,
    before_data, after_data, metadata
  ) values (
    new.owner_id,
    v_household_id,
    v_actor_id,
    'confirm',
    'reconciliation_decision',
    new.id,
    jsonb_build_object(
      'status', old.status,
      'target_kind', old.target_kind,
      'target_id', old.target_id,
      'linked_transaction_id', null
    ),
    jsonb_build_object(
      'status', new.status,
      'target_kind', new.target_kind,
      'target_id', new.target_id,
      'linked_transaction_id', new.transaction_id
    ),
    jsonb_build_object(
      'source', 'match_suggestion',
      'source_transaction_id', new.transaction_id,
      'confidence', new.confidence,
      'evidence', new.evidence
    )
  );
  return new;
end;
$$;

drop trigger if exists audit_confirmed_match_decision_trigger on public.match_suggestions;
create trigger audit_confirmed_match_decision_trigger
after update of status on public.match_suggestions
for each row execute function public.audit_confirmed_match_decision();

revoke all on function public.audit_confirmed_match_decision() from public;
