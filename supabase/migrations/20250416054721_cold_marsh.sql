/*
  # Create Admin Users
  
  1. Changes
    - Create function to handle admin user creation/update
    - Set up two admin accounts with proper credentials
    - Ensure proper profile setup with admin role
*/

-- Function to create or update admin user
CREATE OR REPLACE FUNCTION create_or_update_admin_user(
  p_email TEXT,
  p_password TEXT
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create new user
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated'
    ) RETURNING id INTO v_user_id;

    -- Create profile
    INSERT INTO public.profiles (id, user_role)
    VALUES (v_user_id, 'admin');
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now(),
      email_confirmed_at = now()
    WHERE id = v_user_id;

    -- Update profile
    UPDATE public.profiles
    SET user_role = 'admin'
    WHERE id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up admin accounts
DO $$
BEGIN
  -- Set up first admin
  PERFORM create_or_update_admin_user('1650426286@qq.com', '780930');
  
  -- Set up second admin
  PERFORM create_or_update_admin_user('dongyunweb@gmail.com', '780930');
END $$;

-- Drop the function after use
DROP FUNCTION create_or_update_admin_user;