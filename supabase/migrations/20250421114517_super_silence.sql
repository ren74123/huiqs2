/*
  # Fix message_logs RLS policies

  1. Changes
    - Add RLS policy to allow agents to insert messages for orders related to their packages
    - Add RLS policy to allow agents to view messages for orders related to their packages

  2. Security
    - Enable RLS on message_logs table
    - Add policies to ensure agents can only manage messages for their own orders
    - Maintain existing user access policies
*/

-- Enable RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Add policy for agents to insert messages
CREATE POLICY "Agents can insert messages for their orders"
ON message_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN travel_packages tp ON o.package_id = tp.id
    WHERE o.id = message_logs.order_id
    AND tp.agent_id = auth.uid()
  )
);

-- Add policy for agents to view messages
CREATE POLICY "Agents can view messages for their orders"
ON message_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN travel_packages tp ON o.package_id = tp.id
    WHERE o.id = message_logs.order_id
    AND tp.agent_id = auth.uid()
  )
);