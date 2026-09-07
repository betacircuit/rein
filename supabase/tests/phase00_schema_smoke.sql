begin;

select plan(6);

select has_table('public', 'profiles', 'CTX-001 profile table exists');
select has_table('public', 'lessons', 'CORE-004 lesson remains a distinct table');
select has_table('public', 'receivables', 'CORE-004 receivable remains a distinct table');
select has_table('public', 'subscription_occurrences', 'CORE-004 planned charge remains distinct');
select has_table('public', 'financial_transactions', 'CORE-004 actual movement remains distinct');
select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  ),
  'all public tables have RLS enabled'
);

select * from finish();
rollback;
