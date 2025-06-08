/*
  # Fix Messages RLS Policies
  
  1. Changes
    - Add policy for admins to send system messages
    - Allow system messages to be sent to any user
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;

-- Create new policies
CREATE POLICY "Users can view conversation messages"
ON messages
FOR ALL
TO public
USING (
  -- Allow if user is part of the conversation
  (EXISTS (
    SELECT 1 
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  ))
  OR 
  -- Allow if user is the receiver
  (receiver_id = auth.uid())
  OR
  -- Allow if user is the sender
  (sender_id = auth.uid())
  OR
  -- Allow if user is admin
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ))
);

-- Add policy for system messages
CREATE POLICY "Allow system message creation"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'system' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);