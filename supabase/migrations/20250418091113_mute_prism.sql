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
  VALUES ('licenses', 'licenses', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "licenses_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "licenses_read_own_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "licenses_read_admin_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'licenses' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);