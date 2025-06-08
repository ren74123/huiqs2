-- Update order status check constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_status_check'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'contacted', 'rejected'));

-- Add expire_at column to travel_packages if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'expire_at'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN expire_at date;
  END IF;
END $$;

-- Drop existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'travel_packages_expire_at_check'
    AND table_name = 'travel_packages'
  ) THEN
    ALTER TABLE travel_packages DROP CONSTRAINT travel_packages_expire_at_check;
  END IF;
END $$;

-- Add constraint to ensure expire_at is within 30 days
ALTER TABLE travel_packages
ADD CONSTRAINT travel_packages_expire_at_check
CHECK (
  expire_at IS NULL OR 
  expire_at <= (CURRENT_DATE + INTERVAL '30 days')
);

-- Create index for expire_at
DROP INDEX IF EXISTS idx_travel_packages_expire_at;
CREATE INDEX idx_travel_packages_expire_at 
ON travel_packages(expire_at)
WHERE expire_at IS NOT NULL;

-- Update order status trigger to handle rejection
DO $$ 
BEGIN
  -- First check if the function exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_order_status_v4'
  ) THEN
    DROP FUNCTION IF EXISTS sync_order_status_v4 CASCADE;
  END IF;

  -- Then check if the trigger exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_order_status_trigger_v4'
  ) THEN
    DROP TRIGGER IF EXISTS sync_order_status_trigger_v4 ON orders;
  END IF;
END $$;

-- Create the function
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

-- Create the trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_order_status_trigger_v4'
  ) THEN
    CREATE TRIGGER sync_order_status_trigger_v4
      BEFORE UPDATE OF status ON orders
      FOR EACH ROW
      EXECUTE FUNCTION sync_order_status_v4();
  END IF;
END $$;