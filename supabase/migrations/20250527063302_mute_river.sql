/*
  # Update handle_new_user function to set status as active by default

  1. Changes
    - Update handle_new_user function to set status as active by default
    - Add status column to profiles table if it doesn't exist
    - Set default status to 'active' for all users
*/

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Update existing users to have active status if not set
UPDATE profiles
SET status = 'active'
WHERE status IS NULL;

-- Update handle_new_user function to set status as active by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    status,
    user_role
  ) VALUES (
    new.id,
    COALESCE(new.email, new.phone, 'user_' || new.id),
    'active',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;