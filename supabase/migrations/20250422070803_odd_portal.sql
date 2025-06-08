/*
  # Fix system settings RLS policy

  1. Changes
    - Update RLS policy for system_settings table to allow admins to insert rows
    - Add policy for authenticated users to read system settings

  2. Security
    - Only admins can insert/update system settings
    - All authenticated users can read system settings
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'system_settings'
  ) THEN
    DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);