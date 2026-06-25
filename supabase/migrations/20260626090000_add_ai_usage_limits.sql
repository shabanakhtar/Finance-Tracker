create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  period_start date not null,
  count integer not null default 0,
  last_used_at timestamptz,
  cached_response jsonb,
  cached_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_usage_feature_check check (feature in ('ai_chat', 'receipt_scan', 'product_recommendation')),
  constraint ai_usage_count_non_negative check (count >= 0),
  constraint ai_usage_user_feature_period_unique unique (user_id, feature, period_start)
);

create index if not exists ai_usage_user_period_idx
  on public.ai_usage (user_id, period_start desc);

create index if not exists ai_usage_user_feature_period_idx
  on public.ai_usage (user_id, feature, period_start desc);

drop trigger if exists ai_usage_set_updated_at on public.ai_usage;
create trigger ai_usage_set_updated_at
before update on public.ai_usage
for each row
execute function public.set_updated_at();

alter table public.ai_usage enable row level security;

drop policy if exists "Users can read own ai usage" on public.ai_usage;
create policy "Users can read own ai usage"
on public.ai_usage
for select
to authenticated
using ((select auth.uid()) = user_id);
