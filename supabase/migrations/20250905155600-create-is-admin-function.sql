-- Create is_admin() helper used by RLS policies
-- This checks if the current auth.uid() has an 'admin' role in public.user_roles

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;

-- Allow execution for anon/authenticated (so policies can call it)
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Ensure RLS is enabled for discussions (safe if already enabled)
alter table if exists public.discussions enable row level security;
