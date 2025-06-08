-- Add commission_rate column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE system_settings 
    ADD COLUMN commission_rate numeric DEFAULT 5;
  END IF;
END $$;

-- Update existing records to have the commission_rate value
UPDATE system_settings
SET commission_rate = 5
WHERE commission_rate IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN system_settings.commission_rate IS 'Commission rate percentage for travel agencies';