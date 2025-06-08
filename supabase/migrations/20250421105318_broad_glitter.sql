/*
  # Update message_logs RLS policies

  1. Changes
    - Add new RLS policy to allow agents to create messages for their orders
    - Modify existing policies to be more specific about agent access

  2. Security
    - Enable RLS on message_logs table
    - Add policy for agents to create messages
    - Ensure agents can only access messages for their own orders
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "agent_message_logs_policy_v2" ON message_logs;
DROP POLICY IF EXISTS "Agents can manage message logs" ON message_logs;

-- Create new policy for agents to manage messages
CREATE POLICY "agents_can_manage_messages"
ON message_logs
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN travel_packages tp ON o.package_id = tp.id
    WHERE o.id = message_logs.order_id
    AND tp.agent_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN travel_packages tp ON o.package_id = tp.id
    WHERE o.id = message_logs.order_id
    AND tp.agent_id = auth.uid()
    AND message_logs.from_role = 'agent'
  )
);

-- Ensure RLS is enabled
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;