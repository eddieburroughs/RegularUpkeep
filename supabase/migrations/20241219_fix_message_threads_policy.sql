-- Fix message_threads SELECT policy
-- The policy incorrectly compared thread_participants.thread_id = thread_participants.id
-- Should compare to message_threads.id

DROP POLICY IF EXISTS "message_threads_participant_select" ON message_threads;

CREATE POLICY "message_threads_participant_select" ON message_threads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM thread_participants
    WHERE thread_participants.thread_id = message_threads.id
    AND thread_participants.user_id = auth.uid()
  )
  OR created_by = auth.uid()
  OR is_admin()
);
