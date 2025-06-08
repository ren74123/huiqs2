/*
  # Fix message_logs RLS policies
  
  1. Changes
    - Drop existing policies to avoid conflicts
    - Create comprehensive policies for message_logs table
    - Enable proper agent access for order-related messages
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "agents_can_manage_messages" ON message_logs;
DROP POLICY IF EXISTS "Users can view their message logs" ON message_logs;
DROP POLICY IF EXISTS "Agents can view order messages" ON message_logs;
DROP POLICY IF EXISTS "admin_message_logs_policy_v2" ON message_logs;
DROP POLICY IF EXISTS "agents_can_manage_messages" ON message_logs;
DROP POLICY IF EXISTS "user_message_logs_policy_v2" ON message_logs;

-- Enable RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "admin_message_logs_policy"
ON message_logs
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

-- Create policy for agent access
CREATE POLICY "agent_message_logs_policy"
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
  )
);

-- Create policy for user access
CREATE POLICY "user_message_logs_policy"
ON message_logs
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = message_logs.order_id
    AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = message_logs.order_id
    AND o.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_logs_order_id ON message_logs(order_id);