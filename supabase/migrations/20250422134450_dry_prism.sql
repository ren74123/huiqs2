-- Add departure field to travel_packages table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'departure'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN departure text;
  END IF;
END $$;

-- Create index for departure field
CREATE INDEX IF NOT EXISTS idx_travel_packages_departure 
ON travel_packages(departure);

-- Update discount_expires_at constraint to limit to 3 days instead of 30
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'discount_expires_at_check'
    AND table_name = 'travel_packages'
  ) THEN
    ALTER TABLE travel_packages DROP CONSTRAINT discount_expires_at_check;
  END IF;
END $$;

-- Add new constraint limiting discount to 3 days
ALTER TABLE travel_packages
ADD CONSTRAINT discount_expires_at_check
CHECK (
  NOT is_discounted OR
  (discount_expires_at IS NULL OR 
   (discount_expires_at >= CURRENT_DATE AND 
    discount_expires_at <= (CURRENT_DATE + INTERVAL '3 days')))
);