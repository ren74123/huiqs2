-- Add is_international column to travel_packages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'is_international'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN is_international boolean DEFAULT false;
  END IF;
END $$;

-- Create index for is_international
CREATE INDEX IF NOT EXISTS idx_travel_packages_is_international 
ON travel_packages(is_international)
WHERE is_international = true;

-- Update discount_price_check constraint to account for international packages
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discount_price_check'
    AND table_name = 'travel_packages'
  ) THEN
    ALTER TABLE travel_packages DROP CONSTRAINT discount_price_check;
  END IF;
END $$;

-- Add new constraint that accounts for international packages
ALTER TABLE travel_packages
ADD CONSTRAINT discount_price_check
CHECK (
  NOT is_discounted OR 
  (discount_price IS NOT NULL AND original_price IS NOT NULL AND discount_price < original_price)
);

-- Update package_price_on_discount function to handle international flag
CREATE OR REPLACE FUNCTION update_package_price_on_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- Cannot be both discounted and international
  IF NEW.is_discounted AND NEW.is_international THEN
    NEW.is_international := false;
  END IF;

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