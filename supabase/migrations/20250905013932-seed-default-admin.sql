-- Seed default admin role(s) by linking existing auth.users to public.user_roles
-- NOTE: Passwords cannot be seeded in plaintext. Create the user(s) in Supabase Auth first
-- (Dashboard -> Auth -> Add User or Invite). Then this script will promote them to admin.

-- 1) Promote known emails to admin, if they exist in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN (
  'admin@local.test',
  'richie@dialogous.com',
  'richie@istayusa.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Safety: If no admin exists at all, allow the first authenticated user to self-bootstrap as admin.
-- This policy may already exist in earlier migrations; keeping here as a fallback for fresh environments.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Bootstrap first admin'
  ) THEN
    CREATE POLICY "Bootstrap first admin"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      role = 'admin'::app_role AND 
      user_id = auth.uid() AND
      (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin'::app_role) = 0
    );
  END IF;
END
$$;

-- 3) Verification helper (optional to run manually):
-- select u.email, ur.role from auth.users u join public.user_roles ur on ur.user_id = u.id where ur.role = 'admin';
