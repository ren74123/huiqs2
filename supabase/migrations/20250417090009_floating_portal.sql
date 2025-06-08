/*
  # Add storage policies for ID card uploads

  1. Changes
    - Create storage bucket for ID cards if it doesn't exist
    - Drop existing policies to avoid conflicts
    - Add new policies for:
      - Authenticated users to upload their own ID cards
      - Users to read their own ID cards
      - Agents to read ID cards for their package orders
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Agents can read order ID cards" ON storage.objects;

-- Create new policies
CREATE POLICY "Users can upload their own ID cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own ID cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Agents can read order ID cards"
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