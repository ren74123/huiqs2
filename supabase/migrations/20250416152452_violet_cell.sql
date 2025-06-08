/*
  # System Settings Schema

  1. New Tables
    - `system_settings`
      - `id` (integer, primary key)
      - `maintenance_mode` (boolean)
      - `registration_enabled` (boolean)
      - `email_verification_required` (boolean)
      - `max_travel_packages_per_agent` (integer)
      - `notification_settings` (jsonb)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for admin-only access
*/

-- Create system settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
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
  updated_at timestamptz DEFAULT now()
);

-- Add constraint to ensure only one row exists
ALTER TABLE public.system_settings
ADD CONSTRAINT system_settings_single_row CHECK (id = 1);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
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