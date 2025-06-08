/*
  # Fix Duplicate Order Status Messages
  
  1. Changes
    - Drop all existing order status triggers
    - Create a single, unified trigger function
    - Ensure only one message is created per status change
    - Prevent duplicate status update messages
*/

-- Drop all existing order status triggers
DROP TRIGGER IF EXISTS sync_order_status_trigger ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v1 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v2 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v3 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v4 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v5 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v6 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v7 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v8 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v9 ON orders;
DROP TRIGGER IF EXISTS sync_order_status_trigger_v10 ON orders;

-- Drop all existing order status functions
DROP FUNCTION IF EXISTS sync_order_status CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v1 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v2 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v3 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v4 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v5 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v6 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v7 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v8 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v9 CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_v10 CASCADE;

-- Create a single, unified function for order status updates
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status has changed
  IF NEW.status != OLD.status THEN
    -- Insert a single message log for status change
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

-- Create a single trigger for order status changes
CREATE TRIGGER handle_order_status_change_trigger
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_change();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status_unified ON orders(status);