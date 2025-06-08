/*
  # System Settings Table

  1. Changes
    - Create system settings table if not exists
    - Add single row constraint
    - Enable RLS with admin-only policies
    - Set up triggers for updated_at
    - Insert default settings

  2. Security
    - Enable RLS
    - Add admin-only policies
*/

-- Drop existing policies if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' 
    AND policyname = 'Only admins can manage system settings'
  ) THEN
    DROP POLICY "Only admins can manage system settings" ON public.system_settings;
  END IF;
END $$;

-- Drop existing constraints if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'system_settings_single_row'
    AND table_name = 'system_settings'
  ) THEN
    ALTER TABLE public.system_settings DROP CONSTRAINT system_settings_single_row;
  END IF;
END $$;

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
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
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