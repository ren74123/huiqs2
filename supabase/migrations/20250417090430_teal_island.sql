/*
  # Fix ID Cards Storage Policies
  
  1. Changes
    - Drop existing policies to avoid conflicts
    - Create storage bucket if not exists
    - Add new policies for:
      - User uploads
      - User reads
      - Agent reads
      - Admin reads
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Agents can read ID cards for their package orders" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow ID card uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow ID card reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow agent ID card reads" ON storage.objects;

-- Create bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('id-cards', 'id-cards', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "id_cards_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "id_cards_read_own_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "id_cards_read_agent_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN travel_packages tp ON o.package_id = tp.id
    WHERE 
      tp.agent_id = auth.uid() AND
      o.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "id_cards_read_admin_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);