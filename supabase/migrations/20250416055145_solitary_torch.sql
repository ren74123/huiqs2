/*
  # Update Admin Users
  
  1. Changes
    - Update admin accounts with proper credentials
    - Ensure profiles exist with required fields
    - Use role_type instead of user_role
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Update first admin account (1650426286@qq.com)
  UPDATE auth.users
  SET 
    encrypted_password = crypt('780930', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = now(),
    is_super_admin = false,
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{}'::jsonb,
    aud = 'authenticated',
    role = 'authenticated'
  WHERE email = '1650426286@qq.com'
  RETURNING id INTO v_user_id;

  -- Ensure admin role in profiles with required fields
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      username,
      full_name,
      role_type
    )
    VALUES (
      v_user_id,
      'admin1',
      'Admin User 1',
      'admin'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      role_type = 'admin';
  END IF;

  -- Update second admin account (dongyunweb@gmail.com)
  UPDATE auth.users
  SET 
    encrypted_password = crypt('780930', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = now(),
    is_super_admin = false,
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{}'::jsonb,
    aud = 'authenticated',
    role = 'authenticated'
  WHERE email = 'dongyunweb@gmail.com'
  RETURNING id INTO v_user_id;

  -- Ensure admin role in profiles with required fields
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      username,
      full_name,
      role_type
    )
    VALUES (
      v_user_id,
      'admin2',
      'Admin User 2',
      'admin'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      role_type = 'admin';
  END IF;
END $$;