create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all privileges on table public.transactions from public, anon, authenticated;
revoke all privileges on table public.budgets from public, anon, authenticated;
revoke all privileges on table public.ai_usage from public, anon, authenticated;

grant select, insert, update, delete on public.transactions to service_role;
grant select, insert, update, delete on public.budgets to service_role;
grant select, insert, update, delete on public.ai_usage to service_role;
