/*
  # Add WeChat Authentication Support

  1. Changes
    - Add wechat_open_id to profiles table
    - Add phone field to profiles table
    - Update handle_new_user function
*/

-- Add WeChat and phone fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wechat_open_id text UNIQUE,
ADD COLUMN IF NOT EXISTS phone text UNIQUE;

-- Update handle_new_user function to handle WeChat users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;