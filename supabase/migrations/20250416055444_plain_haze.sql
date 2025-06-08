/*
  # Update Admin User Role
  
  1. Changes
    - Add user_role column if it doesn't exist
    - Set admin role for specific user
*/

DO $$
BEGIN
  -- First ensure the user_role column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'user_role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN user_role text DEFAULT 'user' 
    CHECK (user_role IN ('user', 'agent', 'admin'));
  END IF;

  -- Update user role to admin
  UPDATE public.profiles
  SET user_role = 'admin'
  WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = '1650426286@qq.com'
  );
END $$;