/*
  # Create New Admin User
  
  1. Changes
    - Create new admin user with proper credentials
    - Create profile with required username and role_type
*/

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    is_super_admin,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    v_user_id,
    '1572570271@qq.com',
    crypt('123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    false,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated'
  );

  -- Create profile with admin role and required fields
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    role_type
  ) VALUES (
    v_user_id,
    'admin3',
    'Admin User 3',
    'admin'
  );
END $$;