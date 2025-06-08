/*
  # Rename Email Verification to Email Registration
  
  1. Changes
    - Add email_registration_enabled column to system_settings table
    - Copy values from email_verification_required to email_registration_enabled
    - Update comments to reflect the new purpose
*/

-- Add email_registration_enabled column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'system_settings' 
    AND column_name = 'email_registration_enabled'
  ) THEN
    ALTER TABLE system_settings 
    ADD COLUMN email_registration_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Copy values from email_verification_required to email_registration_enabled
UPDATE system_settings
SET email_registration_enabled = email_verification_required
WHERE email_registration_enabled IS NULL AND email_verification_required IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN system_settings.email_registration_enabled IS 'Enable email registration for international users';