-- Allow admins to update discussions (e.g., pin/unpin)
-- Assumes an is_admin() helper function already exists (used by delete policy)

-- Optional: ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Clean up any previous update policies to avoid duplicates
DROP POLICY IF EXISTS "Admins can update any discussion (pin)" ON public.discussions;
DROP POLICY IF EXISTS "Admins and owners can update discussions" ON public.discussions;

-- Allow admins to update any discussion row
CREATE POLICY "Admins can update any discussion (pin)"
ON public.discussions
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Optionally, allow owners to update their own rows (if you want creators to edit their post)
CREATE POLICY "Owners can update their own discussions"
ON public.discussions
FOR UPDATE
USING (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text)
WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text);
