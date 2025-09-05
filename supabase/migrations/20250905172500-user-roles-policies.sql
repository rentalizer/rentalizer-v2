-- Ensure RLS is enabled on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Unique constraint to support upserts
DO $$ BEGIN
  ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Clean up possibly conflicting policies
DROP POLICY IF EXISTS "owners_can_select_own_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_can_select_all_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "owners_can_insert_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "owners_can_update_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "owners_can_delete_user_roles" ON public.user_roles;

-- Allow authenticated users to select their own role rows (used by useAdminRole hook)
CREATE POLICY "owners_can_select_own_user_roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text);

-- Optionally allow admins to see all (handy for admin tooling)
CREATE POLICY "admins_can_select_all_user_roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin());

-- Typically inserts/updates/deletes on user_roles are done by service role or admin tools.
-- If you want to allow self-service, uncomment below:
-- CREATE POLICY "owners_can_insert_user_roles"
-- ON public.user_roles FOR INSERT
-- WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text);

-- CREATE POLICY "owners_can_update_user_roles"
-- ON public.user_roles FOR UPDATE
-- USING (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text)
-- WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text);

-- CREATE POLICY "owners_can_delete_user_roles"
-- ON public.user_roles FOR DELETE
-- USING (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text);
