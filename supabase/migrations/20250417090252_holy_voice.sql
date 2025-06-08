/*
  # Add storage policies for ID card uploads

  1. Storage Setup
    - Create storage bucket for ID cards if it doesn't exist
    - Enable RLS on the bucket
  
  2. Security
    - Add policies to allow:
      - Authenticated users to upload their own ID cards
      - Users to read only their own ID cards
      - Admins to read all ID cards
*/

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for uploading ID cards (authenticated users only)
CREATE POLICY "Users can upload their own ID cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = 'id-cards' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy for reading ID cards (user can read their own)
CREATE POLICY "Users can read their own ID cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy for admins to read all ID cards
CREATE POLICY "Admins can read all ID cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);