/*
  # Add content_draft column to travel_packages table

  1. Changes
    - Add content_draft column to store draft content
    - Make it nullable to allow saving drafts
*/

-- Add content_draft column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'content_draft'
  ) THEN
    ALTER TABLE travel_packages 
    ADD COLUMN content_draft text;
  END IF;
END $$;