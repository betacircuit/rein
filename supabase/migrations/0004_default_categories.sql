-- Student OS migration 0004: system transaction categories

insert into public.transaction_categories(owner_id, kind, code, display_name, sort_order) values
  (null, 'income', 'tutoring', '과외', 10),
  (null, 'income', 'scholarship', '장학금', 20),
  (null, 'income', 'allowance', '용돈', 30),
  (null, 'income', 'other_income', '기타 수입', 90),
  (null, 'expense', 'food', '식비', 10),
  (null, 'expense', 'cafe', '카페', 20),
  (null, 'expense', 'transport', '교통', 30),
  (null, 'expense', 'housing', '주거', 40),
  (null, 'expense', 'shopping', '쇼핑', 50),
  (null, 'expense', 'education', '교육', 60),
  (null, 'expense', 'subscription', '구독', 70),
  (null, 'expense', 'household', '자취방', 80),
  (null, 'expense', 'other_expense', '기타 지출', 90)
on conflict do nothing;
