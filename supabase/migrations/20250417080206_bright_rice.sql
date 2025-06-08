/*
  # Add content column to travel_packages table

  1. Changes
    - Add 'content' column to travel_packages table
      - Type: text
      - Nullable: true
      - Description: Stores detailed content/description for travel packages

  2. Notes
    - Using IF NOT EXISTS to prevent errors if column already exists
    - Column is nullable to maintain compatibility with existing records
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN content text;
  END IF;
END $$;