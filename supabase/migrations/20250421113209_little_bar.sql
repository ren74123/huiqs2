-- Drop old function and trigger first
DROP FUNCTION IF EXISTS sync_order_status_v5 CASCADE;

-- Create new function
CREATE OR REPLACE FUNCTION sync_order_status_v5()
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER sync_order_status_trigger_v5
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status_v5();

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "admin_message_logs_policy" ON message_logs;
DROP POLICY IF EXISTS "agent_message_logs_policy" ON message_logs;
DROP POLICY IF EXISTS "user_message_logs_policy" ON message_logs;
DROP POLICY IF EXISTS "Admins can manage message logs" ON message_logs;
DROP POLICY IF EXISTS "Agents can manage message logs" ON message_logs;
DROP POLICY IF EXISTS "Users can view their message logs" ON message_logs;
DROP POLICY IF EXISTS "agents_can_manage_messages" ON message_logs;
DROP POLICY IF EXISTS "admin_message_logs_policy_v3" ON message_logs;
DROP POLICY IF EXISTS "agent_message_logs_policy_v3" ON message_logs;
DROP POLICY IF EXISTS "user_message_logs_policy_v3" ON message_logs;
DROP POLICY IF EXISTS "admin_message_logs_policy_v4" ON message_logs;
DROP POLICY IF EXISTS "agent_message_logs_policy_v4" ON message_logs;
DROP POLICY IF EXISTS "user_message_logs_policy_v4" ON message_logs;
DROP POLICY IF EXISTS "admin_message_logs_policy_v5" ON message_logs;
DROP POLICY IF EXISTS "agent_message_logs_policy_v5" ON message_logs;
DROP POLICY IF EXISTS "user_message_logs_policy_v5" ON message_logs;

-- Enable RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names
CREATE POLICY "admin_message_logs_policy_v7"
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

CREATE POLICY "agent_message_logs_policy_v7"
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

CREATE POLICY "user_message_logs_policy_v7"
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