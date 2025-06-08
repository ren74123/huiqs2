-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage all message logs" ON message_logs;
DROP POLICY IF EXISTS "Agents can manage messages for their orders" ON message_logs;

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

-- Add policy for agents to manage their own messages
CREATE POLICY "Agents can manage messages for their orders"
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