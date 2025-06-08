/*
  # Update Enterprise Orders Policies
  
  1. Changes
    - Update RLS policies for enterprise_orders table
    - Add policies for users to view their own enterprise orders
    - Add policies for admins to view all enterprise orders
    - Add policies for reviewers to view all enterprise orders
    - Remove agent-specific policies for enterprise orders
*/

-- Drop existing policies if they exist
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

-- Create or update policies for enterprise_orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Users can view their own enterprise orders'
  ) THEN
    CREATE POLICY "Users can view their own enterprise orders"
      ON public.enterprise_orders
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Admins and reviewers can view all enterprise orders'
  ) THEN
    CREATE POLICY "Admins and reviewers can view all enterprise orders"
      ON public.enterprise_orders
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role IN ('admin', 'reviewer')
        )
      );
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_user_id ON public.enterprise_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_status ON public.enterprise_orders(status);