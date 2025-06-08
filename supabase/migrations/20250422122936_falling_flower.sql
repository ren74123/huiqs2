/*
  # Add Discount Fields to Travel Packages
  
  1. Changes
    - Add is_discounted, original_price, discount_price, and discount_expires_at columns
    - Add constraints to ensure valid discount data
    - Create trigger to automatically update price based on discount status
    - Add indexes for better query performance
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add discount fields to travel_packages table
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS is_discounted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS discount_price numeric,
ADD COLUMN IF NOT EXISTS discount_expires_at date;

-- Check if constraints already exist before adding them
DO $$ 
BEGIN
  -- Check if discount_price_check constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discount_price_check'
    AND table_name = 'travel_packages'
  ) THEN
    -- Add constraint to ensure discount_price is less than original_price
    ALTER TABLE travel_packages
    ADD CONSTRAINT discount_price_check
    CHECK (
      NOT is_discounted OR 
      (discount_price IS NOT NULL AND original_price IS NOT NULL AND discount_price < original_price)
    );
  END IF;

  -- Check if discount_expires_at_check constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discount_expires_at_check'
    AND table_name = 'travel_packages'
  ) THEN
    -- Add constraint to ensure discount_expires_at is not in the past
    ALTER TABLE travel_packages
    ADD CONSTRAINT discount_expires_at_check
    CHECK (
      NOT is_discounted OR
      (discount_expires_at IS NULL OR discount_expires_at >= CURRENT_DATE)
    );
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_travel_packages_is_discounted 
ON travel_packages(is_discounted)
WHERE is_discounted = true;

CREATE INDEX IF NOT EXISTS idx_travel_packages_discount_expires_at 
ON travel_packages(discount_expires_at)
WHERE discount_expires_at IS NOT NULL;

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS update_package_price_on_discount_trigger ON travel_packages;
DROP FUNCTION IF EXISTS update_package_price_on_discount CASCADE;

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

-- Create trigger to update price when discount changes
CREATE TRIGGER update_package_price_on_discount_trigger
  BEFORE INSERT OR UPDATE OF is_discounted, original_price, discount_price, discount_expires_at
  ON travel_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_package_price_on_discount();