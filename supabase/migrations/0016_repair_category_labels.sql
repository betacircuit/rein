-- Repair labels that may have been seeded from a legacy non-UTF-8 source file.
update public.transaction_categories set display_name = case code
  when 'tutoring' then '과외'
  when 'scholarship' then '장학금'
  when 'allowance' then '용돈'
  when 'other_income' then '기타 수입'
  when 'food' then '식비'
  when 'cafe' then '카페'
  when 'transport' then '교통'
  when 'housing' then '주거'
  when 'shopping' then '쇼핑'
  when 'education' then '교육'
  when 'subscription' then '구독'
  when 'household' then '자취방'
  when 'other_expense' then '기타 지출'
  else display_name
end
where owner_id is null;
