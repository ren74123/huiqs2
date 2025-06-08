-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('licenses', 'licenses', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('enterprise_docs', 'enterprise_docs', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop all existing policies for these buckets
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
      policyname LIKE '%license%' OR 
      policyname LIKE '%id_card%' OR 
      policyname LIKE '%enterprise%' OR
      policyname LIKE '%avatar%'
    )
  );
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Licenses bucket policies
CREATE POLICY "licenses_upload_policy_v1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "licenses_read_policy_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' AND
  (
    -- Users can read their own licenses
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admins can read all licenses
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
    OR
    -- Reviewers can read licenses for pending applications
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'reviewer'
    )
  )
);

-- 2. ID Cards bucket policies
CREATE POLICY "id_cards_upload_policy_v1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "id_cards_read_policy_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  (
    -- Users can read their own ID cards
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admins can read all ID cards
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
    OR
    -- Agents can read ID cards for their orders
    EXISTS (
      SELECT 1 FROM orders o
      JOIN travel_packages p ON o.package_id = p.id
      WHERE p.agent_id = auth.uid()
      AND position('/' in name) > 0
      AND (storage.foldername(name))[2] = o.id::text
    )
  )
);

-- 3. Enterprise docs bucket policies
CREATE POLICY "enterprise_docs_upload_policy_v1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enterprise_docs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "enterprise_docs_read_policy_v1"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'enterprise_docs' AND
  (
    -- Users can read their own enterprise docs
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admins can read all enterprise docs
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  )
);

-- 4. Avatars bucket policies
CREATE POLICY "avatars_upload_policy_v1"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_read_policy_v1"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
);

CREATE POLICY "avatars_delete_policy_v1"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add read column to message_logs table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_logs' 
    AND column_name = 'read'
  ) THEN
    ALTER TABLE message_logs ADD COLUMN read boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_message_logs_read ON message_logs(read);