-- Idempotently provision Jaewon's three private ledgers through the existing login flow.
create or replace function public.ensure_rein_personal_accounts()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_owner is null or v_email <> 'choi.jaewon@rein.local' then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_owner::text || ':rein-personal-accounts'));

  insert into public.accounts(
    owner_id, institution_name, nickname, account_type, provider,
    external_account_reference, currency, current_balance, available_balance,
    balance_as_of, included_in_totals
  )
  select v_owner, 'KB국민은행', '돈 모으는 계좌', 'savings', 'mock',
         'rein-kb', 'KRW', 0, 0, now(), true
  where not exists (
    select 1 from public.accounts
     where owner_id = v_owner and is_active
       and (external_account_reference = 'rein-kb' or institution_name ilike '%국민%')
  );

  insert into public.accounts(
    owner_id, institution_name, nickname, account_type, provider,
    external_account_reference, currency, current_balance, available_balance,
    balance_as_of, included_in_totals
  )
  select v_owner, '카카오뱅크', '사용 계좌', 'checking', 'mock',
         'rein-kakao', 'KRW', 0, 0, now(), true
  where not exists (
    select 1 from public.accounts
     where owner_id = v_owner and is_active
       and (external_account_reference = 'rein-kakao' or institution_name ilike '%카카오%')
  );

  insert into public.accounts(
    owner_id, institution_name, nickname, account_type, provider,
    external_account_reference, currency, current_balance, available_balance,
    balance_as_of, included_in_totals
  )
  select v_owner, '우리은행', '생활비 카드', 'card', 'mock',
         'rein-woori', 'KRW', 0, 0, now(), true
  where not exists (
    select 1 from public.accounts
     where owner_id = v_owner and is_active
       and (external_account_reference = 'rein-woori' or institution_name ilike '%우리%')
  );
end;
$$;

revoke all on function public.ensure_rein_personal_accounts() from public;
grant execute on function public.ensure_rein_personal_accounts() to authenticated;
