-- Drop existing policies first
DROP POLICY IF EXISTS "admin_message_logs_policy" ON message_logs;
DROP POLICY IF EXISTS "agent_message_logs_policy" ON message_logs;
DROP POLICY IF EXISTS "user_message_logs_policy" ON message_logs;

-- Add admin policy for message_logs
CREATE POLICY "admin_message_logs_policy_v2"
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
CREATE POLICY "agent_message_logs_policy_v2"
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

-- Add policy for users to view their own order messages
CREATE POLICY "user_message_logs_policy_v2"
ON message_logs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = message_logs.order_id
    AND o.user_id = auth.uid()
  )
);

-- Update order status trigger to handle rejection
CREATE OR REPLACE FUNCTION sync_order_status_v4()
RETURNS trigger AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    -- Insert message log for status change
    INSERT INTO message_logs (
      order_id,
      from_role,
      message
    ) VALUES (
      NEW.id,
      'agent',
      CASE 
        WHEN NEW.status = 'contacted' THEN '订单状态已更新为已联系'
        WHEN NEW.status = 'rejected' THEN '订单已被拒绝'
        ELSE '订单状态已更新为待联系'
      END
    );

    -- Update timestamp
    NEW.updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS sync_order_status_trigger_v3 ON orders;
CREATE TRIGGER sync_order_status_trigger_v4
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status_v4();