/*
  # Add Nickname Changes Column
  
  1. Changes
    - Add nickname_changes column to profiles table
    - Store array of nickname change timestamps
    - Add comment for documentation
*/

-- Add nickname_changes column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'nickname_changes'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN nickname_changes jsonb[] DEFAULT '{}';

    COMMENT ON COLUMN profiles.nickname_changes IS 'Array of nickname change timestamps';
  END IF;
END $$;