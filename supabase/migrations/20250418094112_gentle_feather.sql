-- Drop existing objects first to avoid conflicts
DROP TRIGGER IF EXISTS sync_order_status_trigger ON orders;
DROP FUNCTION IF EXISTS sync_order_status CASCADE;

-- Create function to handle order status updates
CREATE OR REPLACE FUNCTION sync_order_status_v1() 
RETURNS trigger AS $$
BEGIN
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
      ELSE '订单状态已更新为待联系'
    END
  );

  -- Update orders table with new status and timestamp
  UPDATE orders
  SET 
    status = NEW.status,
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER sync_order_status_trigger_v1
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status_v1();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status_v1 ON orders(status);