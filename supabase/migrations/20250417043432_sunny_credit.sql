/*
  # Fix System Settings Schema and Initialization

  1. Changes
    - Drop and recreate system_settings table with proper structure
    - Add proper constraints and defaults
    - Initialize with default values
    - Add RLS policies for admin access
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.system_settings CASCADE;

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
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

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
) ON CONFLICT (id) DO UPDATE SET
  maintenance_mode = EXCLUDED.maintenance_mode,
  registration_enabled = EXCLUDED.registration_enabled,
  email_verification_required = EXCLUDED.email_verification_required,
  max_travel_packages_per_agent = EXCLUDED.max_travel_packages_per_agent,
  notification_settings = EXCLUDED.notification_settings;