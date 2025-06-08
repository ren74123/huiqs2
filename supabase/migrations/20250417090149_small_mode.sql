/*
  # Fix storage policies for ID card uploads

  1. Changes
    - Drop existing policies first to avoid conflicts
    - Create storage bucket for ID cards if it doesn't exist
    - Add new policies for ID card access control
    - Enable RLS on storage objects

  2. Security
    - Private bucket for ID cards
    - Users can only upload/access their own ID cards
    - Agents can access ID cards for their package orders
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Agents can read order ID cards" ON storage.objects;

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Allow ID card uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow ID card reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow agent ID card reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  EXISTS (
    SELECT 1 FROM orders o
    JOIN travel_packages tp ON o.package_id = tp.id
    WHERE 
      tp.agent_id = auth.uid() AND
      o.id::text = (storage.foldername(name))[2]
  )
);