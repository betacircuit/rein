-- The two REIN users existed before the profile trigger was installed.
insert into public.profiles(id, display_name, locale, currency, timezone)
select
  user_record.id,
  case lower(user_record.email)
    when 'choi.jaewon@rein.local' then '최재원'
    when 'kim.taehyeon@rein.local' then '김태현'
    else coalesce(
      nullif(user_record.raw_user_meta_data->>'display_name', ''),
      nullif(user_record.raw_user_meta_data->>'name', ''),
      split_part(coalesce(user_record.email, ''), '@', 1)
    )
  end,
  'ko-KR',
  'KRW',
  'Asia/Seoul'
from auth.users as user_record
where lower(user_record.email) in ('choi.jaewon@rein.local', 'kim.taehyeon@rein.local')
on conflict (id) do update
set display_name = excluded.display_name,
    locale = excluded.locale,
    currency = excluded.currency,
    timezone = excluded.timezone,
    updated_at = now();
