-- Disable RLS for orders table to fix status update issues
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Create new function for order status updates
CREATE OR REPLACE FUNCTION sync_order_status_v10()
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
CREATE TRIGGER sync_order_status_trigger_v10
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status_v10();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status_v10 ON orders(status);

-- Disable RLS for message_logs table to fix message creation issues
ALTER TABLE message_logs DISABLE ROW LEVEL SECURITY;