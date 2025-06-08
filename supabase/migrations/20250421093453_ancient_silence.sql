/*
  # Fix message_logs RLS policy for admin access

  1. Changes
    - Add new RLS policy to allow admins to manage message logs
    - Keep existing policies for users and agents

  2. Security
    - Admins can manage all message logs
    - Users and agents can still manage their own message logs
*/

-- Add admin policy for message_logs
CREATE POLICY "Admins can manage all message logs"
ON message_logs
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);