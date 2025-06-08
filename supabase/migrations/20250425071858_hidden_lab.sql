/*
  # Update Enterprise Order Access Policies
  
  1. Changes
    - Add policies to allow users to view their own enterprise orders
    - Add policies to allow admins to view all enterprise orders
    - Add policies to allow reviewers to view all enterprise orders
  
  2. Security
    - Maintain existing RLS policies
    - Add specific permissions for different user roles
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Users can view their own enterprise orders'
  ) THEN
    DROP POLICY "Users can view their own enterprise orders" ON public.enterprise_orders;
  END IF;
END $$;

-- Create policies for enterprise_orders
CREATE POLICY "Users can view their own enterprise orders"
  ON public.enterprise_orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for admins and reviewers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enterprise_orders' 
    AND policyname = 'Admins can view all enterprise orders'
  ) THEN
    CREATE POLICY "Admins can view all enterprise orders"
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