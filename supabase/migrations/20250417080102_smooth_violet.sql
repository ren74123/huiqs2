/*
  # Create storage bucket for package images
  
  1. New Storage Bucket
    - Creates a new public storage bucket named 'package-images'
    - Enables public access for reading images
    - Restricts uploads to authenticated users only
  
  2. Security
    - Enables RLS policies for secure access control
    - Only authenticated users can upload images
    - Anyone can view uploaded images
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload package images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'package-images' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow public access to view files
CREATE POLICY "Anyone can view package images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'package-images');