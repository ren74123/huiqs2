/*
  # Add Discount Package Fields
  
  1. New Fields
    - `is_discounted` (boolean, default false)
    - `original_price` (numeric, nullable)
    - `discount_price` (numeric, nullable)
    - `discount_expires_at` (date, nullable)
  
  2. Constraints
    - Ensure discount_price is less than original_price when discounted
    - Ensure discount_expires_at is not in the past
  
  3. Indexes
    - Add index for is_discounted for better query performance
    - Add index for discount_expires_at for better query performance
*/

-- Add discount fields to travel_packages table
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS is_discounted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS discount_price numeric,
ADD COLUMN IF NOT EXISTS discount_expires_at date;

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

-- Create trigger to update price when discount changes
CREATE TRIGGER update_package_price_on_discount_trigger
  BEFORE INSERT OR UPDATE OF is_discounted, original_price, discount_price, discount_expires_at
  ON travel_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_package_price_on_discount();