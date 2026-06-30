create or replace function public.finance_monthly_rollup(
  p_user_id uuid,
  p_months integer default 6
)
returns table (
  month text,
  income numeric,
  expense numeric,
  balance numeric,
  transaction_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    to_char(date_trunc('month', t.date), 'YYYY-MM') as month,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)
      - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as balance,
    count(*)::integer as transaction_count
  from public.transactions t
  where t.user_id = p_user_id
    and t.date >= (
      date_trunc('month', current_date)::date
      - ((least(greatest(coalesce(p_months, 6), 1), 24) - 1) * interval '1 month')
    )
  group by date_trunc('month', t.date)
  order by date_trunc('month', t.date) desc;
$$;

create or replace function public.finance_category_rollup(
  p_user_id uuid,
  p_days integer default 90,
  p_limit integer default 8
)
returns table (
  category text,
  income numeric,
  expense numeric,
  net numeric,
  transaction_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.category,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)
      - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as net,
    count(*)::integer as transaction_count
  from public.transactions t
  where t.user_id = p_user_id
    and t.date >= current_date - (least(greatest(coalesce(p_days, 90), 7), 730) * interval '1 day')
  group by t.category
  order by expense desc, income desc
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

create or replace function public.finance_budget_snapshot(
  p_user_id uuid
)
returns table (
  category text,
  limit_amount numeric,
  spent numeric,
  remaining numeric,
  progress numeric,
  is_over boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.category,
    b.limit_amount,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as spent,
    b.limit_amount - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as remaining,
    case
      when b.limit_amount > 0 then least(coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) / b.limit_amount, 1)
      else 0
    end as progress,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) > b.limit_amount as is_over
  from public.budgets b
  left join public.transactions t
    on t.user_id = b.user_id
   and t.category = b.category
   and t.date >= date_trunc('month', current_date)::date
  where b.user_id = p_user_id
  group by b.category, b.limit_amount
  order by is_over desc, progress desc, b.category asc;
$$;

create or replace function public.finance_recent_transactions(
  p_user_id uuid,
  p_limit integer default 12
)
returns table (
  amount numeric,
  category text,
  type text,
  date date,
  notes text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.amount,
    t.category,
    t.type,
    t.date,
    left(coalesce(t.notes, ''), 160) as notes
  from public.transactions t
  where t.user_id = p_user_id
  order by t.date desc, t.created_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;

revoke execute on function public.finance_monthly_rollup(uuid, integer) from public, anon, authenticated;
revoke execute on function public.finance_category_rollup(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.finance_budget_snapshot(uuid) from public, anon, authenticated;
revoke execute on function public.finance_recent_transactions(uuid, integer) from public, anon, authenticated;

grant execute on function public.finance_monthly_rollup(uuid, integer) to service_role;
grant execute on function public.finance_category_rollup(uuid, integer, integer) to service_role;
grant execute on function public.finance_budget_snapshot(uuid) to service_role;
grant execute on function public.finance_recent_transactions(uuid, integer) to service_role;
