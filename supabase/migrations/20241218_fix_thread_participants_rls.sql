-- Fix thread_participants RLS recursion
-- The SELECT policy was referencing itself, causing infinite recursion

-- Create helper function to check if user is a thread participant
-- Uses SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION is_thread_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM thread_participants
    WHERE thread_id = p_thread_id
    AND user_id = auth.uid()
    AND left_at IS NULL
  );
$$;

-- Drop the old policy
DROP POLICY IF EXISTS "thread_participants_select" ON thread_participants;

-- Create new policy using the helper function
CREATE POLICY "thread_participants_select" ON thread_participants
FOR SELECT USING (
  user_id = auth.uid()
  OR is_thread_participant(thread_id)
  OR is_admin()
);
