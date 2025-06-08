/*
  # System Settings Schema

  1. New Tables
    - `system_settings`
      - `id` (integer, primary key, default 1)
      - `maintenance_mode` (boolean, default false)
      - `registration_enabled` (boolean, default true)
      - `email_verification_required` (boolean, default true)
      - `max_travel_packages_per_agent` (integer, default 5)
      - `notification_settings` (jsonb)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for admin access
    - Ensure single row constraint
*/

-- Drop existing objects if they exist
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create system settings table
CREATE TABLE public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  maintenance_mode boolean DEFAULT false,
  registration_enabled boolean DEFAULT true,
  email_verification_required boolean DEFAULT true,
  max_travel_packages_per_agent integer DEFAULT 5,
  notification_settings jsonb DEFAULT '{
    "new_user_notification": true,
    "new_order_notification": true,
    "new_application_notification": true
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT system_settings_single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create admin policy
CREATE POLICY "Only admins can manage system settings"
  ON public.system_settings
  FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

-- Create updated_at trigger
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.system_settings (
  maintenance_mode,
  registration_enabled,
  email_verification_required,
  max_travel_packages_per_agent,
  notification_settings
) VALUES (
  false,
  true,
  true,
  5,
  '{
    "new_user_notification": true,
    "new_order_notification": true,
    "new_application_notification": true
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;