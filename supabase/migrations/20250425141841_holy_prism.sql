/*
  # Fix Enterprise Orders RLS Policies
  
  1. Changes
    - Update RLS policies for enterprise_orders table
    - Allow agents to view all enterprise orders
    - Maintain existing policies for users and admins
  
  2. Security
    - Ensure proper access control
    - Fix issue where agents couldn't see all enterprise orders
*/

-- Drop existing agent policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Agents can view enterprise orders'
  ) THEN
    DROP POLICY "Agents can view enterprise orders" ON public.enterprise_orders;
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

-- Ensure RLS is enabled
ALTER TABLE public.enterprise_orders ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_status ON public.enterprise_orders(status);