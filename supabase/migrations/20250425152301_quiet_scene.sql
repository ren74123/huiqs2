/*
  # Fix ID Cards Bucket and Enterprise Orders Access
  
  1. Changes
    - Create id-cards bucket if it doesn't exist
    - Set bucket to public for easier access
    - Update RLS policies for enterprise_orders to allow agents to view all orders
    - Add has_paid_info_fee column to enterprise_orders table
  
  2. Security
    - Maintain existing RLS policies
    - Add specific permissions for agents
*/

-- Create id-cards bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-cards', 'id-cards', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop all existing policies for id-cards bucket
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON storage.objects;', ' ')
    FROM pg_policies
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (
      policyname LIKE '%id_card%' OR 
      policyname LIKE '%id-card%'
    )
  );
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies for id-cards bucket
CREATE POLICY "id_cards_upload_policy_v3"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-cards' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "id_cards_read_policy_v3"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-cards'
);

CREATE POLICY "id_cards_delete_policy_v3"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Drop existing agent policy for enterprise orders if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Agents can view enterprise orders'
  ) THEN
    DROP POLICY "Agents can view enterprise orders" ON public.enterprise_orders;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Agents can view all enterprise orders'
  ) THEN
    DROP POLICY "Agents can view all enterprise orders" ON public.enterprise_orders;
  END IF;
END $$;

-- Create new policy for agents to view all enterprise orders
CREATE POLICY "Agents can view all enterprise orders"
  ON public.enterprise_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'agent'
    )
  );

-- Add has_paid_info_fee column to enterprise_orders if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enterprise_orders' 
    AND column_name = 'has_paid_info_fee'
  ) THEN
    ALTER TABLE enterprise_orders ADD COLUMN has_paid_info_fee boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_has_paid_info_fee ON enterprise_orders(has_paid_info_fee);