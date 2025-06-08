-- Fix order status trigger
CREATE OR REPLACE FUNCTION sync_order_status() 
RETURNS trigger AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    -- Update message logs
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

    -- Ensure status is updated in orders table
    UPDATE orders
    SET 
      status = NEW.status,
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_order_status_trigger ON orders;

-- Create new trigger
CREATE TRIGGER sync_order_status_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);