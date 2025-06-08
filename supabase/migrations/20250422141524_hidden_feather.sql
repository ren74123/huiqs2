/*
  # Add Package Publishing Cost Settings
  
  1. Changes
    - Add is_publish_package_charged column to system_settings table
    - Add package_publish_cost column to system_settings table
    - Set default values
    - Update existing records
*/

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add is_publish_package_charged column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'is_publish_package_charged'
  ) THEN
    ALTER TABLE system_settings 
    ADD COLUMN is_publish_package_charged boolean DEFAULT false;
  END IF;

  -- Add package_publish_cost column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'package_publish_cost'
  ) THEN
    ALTER TABLE system_settings 
    ADD COLUMN package_publish_cost integer DEFAULT 50;
  END IF;
END $$;

-- Update existing records to have the new values
UPDATE system_settings
SET 
  is_publish_package_charged = COALESCE(is_publish_package_charged, false),
  package_publish_cost = COALESCE(package_publish_cost, 50)
WHERE id = 1;