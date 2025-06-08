/*
  # Add receiver_id to messages table

  1. Changes
    - Add `receiver_id` column to `messages` table
    - Add foreign key constraint to reference profiles table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add receiver_id column
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);