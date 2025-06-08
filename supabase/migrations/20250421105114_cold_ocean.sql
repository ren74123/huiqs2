-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can manage message logs" ON message_logs;
DROP POLICY IF EXISTS "Agents can manage message logs" ON message_logs;
DROP POLICY IF EXISTS "Admins can manage message logs" ON message_logs;

-- Enable RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for agents
CREATE POLICY "Agents can manage message logs"
ON message_logs
FOR ALL
TO authenticated
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

-- Create policy for admins
CREATE POLICY "Admins can manage message logs"
ON message_logs
FOR ALL
TO authenticated
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

-- Create policy for users
CREATE POLICY "Users can view their message logs"
ON message_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = message_logs.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_logs_order_id ON message_logs(order_id);