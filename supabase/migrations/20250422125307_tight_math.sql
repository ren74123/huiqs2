-- Add discount fields to travel_packages table
DO $$ 
BEGIN
  -- Add is_discounted column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'is_discounted'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN is_discounted boolean DEFAULT false;
  END IF;

  -- Add original_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'original_price'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN original_price numeric;
  END IF;

  -- Add discount_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'discount_price'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN discount_price numeric;
  END IF;

  -- Add discount_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'discount_expires_at'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN discount_expires_at date;
  END IF;
END $$;

-- Drop existing constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discount_price_check'
    AND table_name = 'travel_packages'
  ) THEN
    ALTER TABLE travel_packages DROP CONSTRAINT discount_price_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discount_expires_at_check'
    AND table_name = 'travel_packages'
  ) THEN
    ALTER TABLE travel_packages DROP CONSTRAINT discount_expires_at_check;
  END IF;
END $$;

-- Add constraint to ensure discount_price is less than original_price
ALTER TABLE travel_packages
ADD CONSTRAINT discount_price_check
CHECK (
  NOT is_discounted OR 
  (discount_price IS NOT NULL AND original_price IS NOT NULL AND discount_price < original_price)
);

-- Add constraint to ensure discount_expires_at is not in the past
ALTER TABLE travel_packages
ADD CONSTRAINT discount_expires_at_check
CHECK (
  NOT is_discounted OR
  (discount_expires_at IS NULL OR discount_expires_at >= CURRENT_DATE)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_travel_packages_is_discounted 
ON travel_packages(is_discounted)
WHERE is_discounted = true;

CREATE INDEX IF NOT EXISTS idx_travel_packages_discount_expires_at 
ON travel_packages(discount_expires_at)
WHERE discount_expires_at IS NOT NULL;

-- Create function to automatically update price when discount changes
CREATE OR REPLACE FUNCTION update_package_price_on_discount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_discounted AND NEW.discount_price IS NOT NULL THEN
    -- If package is discounted, set price to discount_price
    NEW.price := NEW.discount_price;
  ELSIF NEW.original_price IS NOT NULL THEN
    -- If package is not discounted, set price to original_price
    NEW.price := NEW.original_price;
  END IF;
  
  -- If discount has expired, remove discount
  IF NEW.is_discounted AND NEW.discount_expires_at < CURRENT_DATE THEN
    NEW.is_discounted := false;
    NEW.price := NEW.original_price;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_package_price_on_discount_trigger ON travel_packages;

-- Create trigger to update price when discount changes
CREATE TRIGGER update_package_price_on_discount_trigger
  BEFORE INSERT OR UPDATE OF is_discounted, original_price, discount_price, discount_expires_at
  ON travel_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_package_price_on_discount();