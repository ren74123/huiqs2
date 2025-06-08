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