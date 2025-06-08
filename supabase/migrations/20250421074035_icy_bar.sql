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

-- Update order status trigger
CREATE OR REPLACE FUNCTION sync_order_status_v3()
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

-- Create or update package count check function
CREATE OR REPLACE FUNCTION check_agent_package_limit()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM travel_packages
    WHERE agent_id = NEW.agent_id
    AND status = 'approved'
    AND (expire_at IS NULL OR expire_at > CURRENT_DATE)
  ) >= 1 THEN
    RAISE EXCEPTION 'Agent cannot have more than one active package';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for package limit
DROP TRIGGER IF EXISTS check_agent_package_limit_trigger ON travel_packages;
CREATE TRIGGER check_agent_package_limit_trigger
  BEFORE INSERT OR UPDATE OF status ON travel_packages
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION check_agent_package_limit();

-- Create index for expire_at
DROP INDEX IF EXISTS idx_travel_packages_expire_at;
CREATE INDEX idx_travel_packages_expire_at 
ON travel_packages(expire_at)
WHERE expire_at IS NOT NULL;