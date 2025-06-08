-- Drop existing policies first
DROP POLICY IF EXISTS "id_cards_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_read_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_read_admin_policy" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_access_policy_v1" ON storage.objects;
DROP POLICY IF EXISTS "id_cards_read_policy_v1" ON storage.objects;

-- Create storage bucket for ID cards if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "id_cards_access_policy_v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "id_cards_read_policy_v2"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  (
    -- Allow users to read their own ID cards
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Allow admins to read all ID cards
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
    OR
    -- Allow agents to read ID cards for their orders
    EXISTS (
      SELECT 1 FROM orders o
      JOIN travel_packages tp ON o.package_id = tp.id
      WHERE tp.agent_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[2]
    )
  )
);