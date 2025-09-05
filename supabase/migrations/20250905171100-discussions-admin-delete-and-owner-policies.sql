-- Ensure RLS is enabled for discussions
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Clean up existing delete/update policies to avoid duplicates
DROP POLICY IF EXISTS "Admins can delete any discussion" ON public.discussions;
DROP POLICY IF EXISTS "Owners can delete their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Owners can update their own discussions" ON public.discussions;

-- Allow admins to delete any discussion row
CREATE POLICY "Admins can delete any discussion"
ON public.discussions
FOR DELETE
USING (public.is_admin());

-- Allow owners to delete their own rows
CREATE POLICY "Owners can delete their own discussions"
ON public.discussions
FOR DELETE
USING ((auth.uid())::text = (user_id)::text);

-- Ensure owners can update their own rows (title/content edits)
CREATE POLICY "Owners can update their own discussions"
ON public.discussions
FOR UPDATE
USING ((auth.uid())::text = (user_id)::text)
WITH CHECK ((auth.uid())::text = (user_id)::text);
