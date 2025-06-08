/*
  # Storage Bucket Permissions
  
  1. New Storage Buckets
    - licenses: For business licenses (旅行社营业执照)
    - id-cards: For ID card images (订单身份证)
    - enterprise_docs: For enterprise team building documents (企业团建资质)
  
  2. Security
    - Enable RLS on all buckets
    - Configure proper access policies
    - Ensure no public access
*/

-- Create licenses bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('licenses', 'licenses', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- Create id-cards bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- Create enterprise_docs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('enterprise_docs', 'enterprise_docs', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "licenses_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "licenses_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_docs_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "enterprise_docs_read_policy" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Licenses bucket policies
-- Allow authenticated users to upload licenses
CREATE POLICY "licenses_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses' AND
  auth.role() = 'authenticated'
);

-- Allow only admins to view licenses
CREATE POLICY "licenses_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

-- 2. ID Cards bucket policies
-- Allow authenticated users to upload ID cards
CREATE POLICY "id_cards_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  auth.role() = 'authenticated'
);

-- Allow admins and relevant agents to view ID cards
CREATE POLICY "id_cards_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  (
    -- Admins can view all ID cards
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
    OR
    -- Agents can view ID cards for their orders
    EXISTS (
      SELECT 1 FROM orders o
      JOIN travel_packages p ON o.package_id = p.id
      WHERE position('/' in name) > 0 
        AND split_part(name, '/', 2)::uuid = o.id
        AND p.agent_id = auth.uid()
    )
  )
);

-- 3. Enterprise docs bucket policies
-- Allow authenticated users to upload enterprise docs
CREATE POLICY "enterprise_docs_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enterprise_docs' AND
  auth.role() = 'authenticated'
);

-- Allow only admins to view enterprise docs
CREATE POLICY "enterprise_docs_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'enterprise_docs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);