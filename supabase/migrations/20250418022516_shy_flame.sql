/*
  # Add nickname changes tracking
  
  1. Changes
    - Add nickname_changes column to profiles table
    - Store timestamp array of nickname changes
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS nickname_changes jsonb[] DEFAULT '{}';

COMMENT ON COLUMN profiles.nickname_changes IS 'Array of nickname change timestamps';