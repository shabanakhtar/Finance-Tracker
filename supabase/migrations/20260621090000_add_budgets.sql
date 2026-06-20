create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_limit_amount_positive check (limit_amount > 0),
  constraint budgets_category_not_blank check (length(trim(category)) > 0),
  constraint budgets_user_category_unique unique (user_id, category)
);

create index if not exists budgets_user_category_idx
  on public.budgets (user_id, category);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row
execute function public.set_updated_at();

alter table public.budgets enable row level security;

drop policy if exists "Users can read own budgets" on public.budgets;
create policy "Users can read own budgets"
on public.budgets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own budgets" on public.budgets;
create policy "Users can insert own budgets"
on public.budgets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own budgets" on public.budgets;
create policy "Users can update own budgets"
on public.budgets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can delete own budgets"
on public.budgets
for delete
to authenticated
using ((select auth.uid()) = user_id);
