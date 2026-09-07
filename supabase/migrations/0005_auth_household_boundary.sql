-- Phase 01: authenticated profile onboarding and household privacy boundary.

alter table public.household_members
  add column invitee_email public.citext;

alter table public.household_members
  add constraint household_members_invitation_shape check (
    status <> 'invited'
    or (user_id is null and invitee_email is not null and joined_at is null and left_at is null)
  ),
  add constraint household_members_active_shape check (
    status <> 'active'
    or (user_id is not null and invitee_email is null and joined_at is not null and left_at is null)
  );

create unique index household_members_one_pending_email_per_household
  on public.household_members(household_id, invitee_email)
  where status = 'invited';

create or replace function public.current_user_email()
returns public.citext
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '')::public.citext;
$$;

create or replace function public.is_household_invitee(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.status = 'invited'
      and hm.invitee_email = public.current_user_email()
  );
$$;

create or replace function public.create_household_with_owner(
  p_name text,
  p_owner_display_name text,
  p_home_type text default 'two_room_rental'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_owner_display_name), '') is null then
    raise exception 'household and owner names are required' using errcode = '22023';
  end if;

  insert into public.households(name, home_type, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_home_type), ''), 'two_room_rental'), v_user_id)
  returning id into v_household_id;

  insert into public.household_members(
    household_id, user_id, display_name, role, status, joined_at
  ) values (
    v_household_id, v_user_id, trim(p_owner_display_name), 'owner', 'active', now()
  );

  return v_household_id;
end;
$$;

create or replace function public.invite_household_member(
  p_household_id uuid,
  p_invitee_email public.citext,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership_id uuid;
  v_email public.citext := lower(trim(p_invitee_email::text))::public.citext;
begin
  if not public.is_household_owner(p_household_id) then
    raise exception 'active household owner required' using errcode = '42501';
  end if;
  if v_email is null or v_email::text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'valid invite email required' using errcode = '22023';
  end if;
  if nullif(trim(p_display_name), '') is null then
    raise exception 'display name required' using errcode = '22023';
  end if;

  insert into public.household_members(
    household_id, user_id, invitee_email, display_name, role, status, invited_by
  ) values (
    p_household_id, null, v_email, trim(p_display_name), 'member', 'invited', auth.uid()
  )
  returning id into v_membership_id;

  return v_membership_id;
end;
$$;

create or replace function public.accept_household_invitation(p_membership_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_email public.citext := public.current_user_email();
begin
  if auth.uid() is null or v_email is null then
    raise exception 'authenticated email required' using errcode = '42501';
  end if;

  update public.household_members
  set user_id = auth.uid(),
      invitee_email = null,
      status = 'active',
      joined_at = now(),
      left_at = null
  where id = p_membership_id
    and status = 'invited'
    and invitee_email = v_email
  returning household_id into v_household_id;

  if v_household_id is null then
    raise exception 'matching invitation not found' using errcode = '42501';
  end if;

  return v_household_id;
end;
$$;

create or replace function public.leave_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and status = 'active'
      and role = 'owner'
  ) then
    raise exception 'transfer ownership before leaving' using errcode = '42501';
  end if;

  update public.household_members
  set status = 'left', left_at = now()
  where household_id = p_household_id
    and user_id = auth.uid()
    and status = 'active'
    and role = 'member';

  if not found then
    raise exception 'active household membership not found' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.enforce_household_membership_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'left' then
    raise exception 'left membership is terminal' using errcode = '23514';
  end if;

  if old.role is distinct from new.role then
    raise exception 'membership role is immutable in Phase 01' using errcode = '23514';
  end if;

  if old.status = new.status then
    if old.user_id is distinct from new.user_id then
      raise exception 'active membership identity is immutable' using errcode = '23514';
    end if;
    if old.status <> 'invited' and old.invitee_email is distinct from new.invitee_email then
      raise exception 'invite email exists only while invited' using errcode = '23514';
    end if;
    return new;
  end if;

  if old.status = 'invited' and new.status = 'active' then
    if auth.uid() is null
      or new.user_id is distinct from auth.uid()
      or old.invitee_email is distinct from public.current_user_email() then
      raise exception 'only the matching invitee may accept' using errcode = '42501';
    end if;
    new.invitee_email := null;
    new.joined_at := coalesce(new.joined_at, now());
    new.left_at := null;
    return new;
  end if;

  if old.status = 'invited' and new.status = 'left' then
    if not public.is_household_owner(old.household_id) then
      raise exception 'only the household owner may cancel an invitation' using errcode = '42501';
    end if;
    new.user_id := null;
    new.invitee_email := null;
    new.left_at := coalesce(new.left_at, now());
    return new;
  end if;

  if old.status = 'active' and new.status = 'left' then
    if old.role = 'owner' and old.user_id = auth.uid() then
      raise exception 'transfer ownership before leaving' using errcode = '42501';
    end if;
    if old.user_id is distinct from auth.uid() and not public.is_household_owner(old.household_id) then
      raise exception 'member or owner required' using errcode = '42501';
    end if;
    new.left_at := coalesce(new.left_at, now());
    return new;
  end if;

  raise exception 'invalid membership status transition' using errcode = '23514';
end;
$$;

create trigger enforce_household_membership_transition
before update of status, user_id, invitee_email, role on public.household_members
for each row execute function public.enforce_household_membership_transition();

drop policy household_members_select_member on public.household_members;
create policy household_members_select_member_or_invitee on public.household_members for select
  using (
    public.is_household_member(household_id)
    or (status = 'invited' and invitee_email = public.current_user_email())
  );

drop policy household_members_insert_owner_or_creator on public.household_members;

-- Household creation and membership removal must preserve the RPC-backed,
-- auditable state machine. Owners can cancel or remove through a `left`
-- transition, but cannot erase membership history with a direct delete.
drop policy households_insert_creator on public.households;
drop policy household_members_delete_owner on public.household_members;

drop policy households_select_member on public.households;
create policy households_select_member_or_invitee on public.households for select
  using (public.is_household_member(id) or public.is_household_invitee(id));

revoke all on function public.create_household_with_owner(text, text, text) from public, anon;
revoke all on function public.invite_household_member(uuid, public.citext, text) from public, anon;
revoke all on function public.accept_household_invitation(uuid) from public, anon;
revoke all on function public.leave_household(uuid) from public, anon;

grant execute on function public.create_household_with_owner(text, text, text) to authenticated;
grant execute on function public.invite_household_member(uuid, public.citext, text) to authenticated;
grant execute on function public.accept_household_invitation(uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
