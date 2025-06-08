/*
  # Add note field to enterprise_order_applications
  
  1. Changes
    - Add note column to enterprise_order_applications table
    - Allow agents to provide additional information with their applications
*/

-- Add note column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enterprise_order_applications' 
    AND column_name = 'note'
  ) THEN
    ALTER TABLE enterprise_order_applications 
    ADD COLUMN note text;
  END IF;
END $$;

-- Update storage policies to allow admins to view all files
CREATE POLICY "Admins can view all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

-- Create policy for admins to receive notifications about enterprise orders
CREATE POLICY "Admins receive enterprise order notifications"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'system' AND
  content LIKE '%企业团建%'
);