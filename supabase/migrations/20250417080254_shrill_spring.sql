/*
  # Refresh Schema and Setup Storage
  
  1. Changes
    - Refresh schema cache
    - Create package-images storage bucket if not exists
    - Set up storage policies
*/

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Create storage bucket if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'package-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('package-images', 'package-images', true);
  END IF;
END $$;

-- Create or replace storage policies
DROP POLICY IF EXISTS "Authenticated users can upload package images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view package images" ON storage.objects;

CREATE POLICY "Authenticated users can upload package images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'package-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view package images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'package-images');