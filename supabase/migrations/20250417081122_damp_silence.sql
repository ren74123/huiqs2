/*
  # Add review note column to travel packages

  1. Changes
    - Add `review_note` column to `travel_packages` table
      - Type: text
      - Nullable: true
      - Default: null
      - Purpose: Store admin review notes when approving/rejecting packages

  2. Security
    - Inherits existing RLS policies from travel_packages table
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'review_note'
  ) THEN
    ALTER TABLE travel_packages 
    ADD COLUMN review_note text;
  END IF;
END $$;