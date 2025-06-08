/*
  # Update Admin Password
  
  1. Changes
    - Update password for admin user using proper password hashing
    - Ensure email confirmation is set
*/

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID for the admin email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = '1650426286@qq.com';

  -- Update the password using proper password hashing
  IF admin_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = crypt('780930', gen_salt('bf')),
      updated_at = now(),
      email_confirmed_at = now()
    WHERE id = admin_user_id;
  END IF;
END $$;