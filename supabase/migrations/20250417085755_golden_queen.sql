/*
  # Create ID Cards Storage Bucket
  
  1. Changes
    - Create storage bucket for ID card images
    - Add policies for secure access
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own ID cards
CREATE POLICY "Users can upload their own ID cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to read their own ID cards
CREATE POLICY "Users can read their own ID cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);