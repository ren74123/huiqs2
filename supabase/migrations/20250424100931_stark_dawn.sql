/*
  # Fix Reviewer Access to Admin Pages
  
  1. Changes
    - Add RLS policies to allow reviewers to access travel_packages
    - Add RLS policies to allow reviewers to access agent_applications
    - Ensure reviewers can view and manage packages and applications
  
  2. Security
    - Maintain existing admin access
    - Add specific reviewer permissions
*/

-- Create policies for reviewer access to travel_packages if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'travel_packages' 
    AND policyname = 'Reviewers can manage all packages'
  ) THEN
    CREATE POLICY "Reviewers can manage all packages"
      ON travel_packages
      FOR ALL
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        )
      );
  END IF;
END $$;

-- Create policies for reviewer access to agent_applications if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_applications' 
    AND policyname = 'Reviewers can view all applications'
  ) THEN
    CREATE POLICY "Reviewers can view all applications"
      ON agent_applications
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        )
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_applications' 
    AND policyname = 'Reviewers can manage applications'
  ) THEN
    CREATE POLICY "Reviewers can manage applications"
      ON agent_applications
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        )
      );
  END IF;
END $$;

-- Create policies for reviewer access to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Reviewers can view all profiles'
  ) THEN
    CREATE POLICY "Reviewers can view all profiles"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        )
      );
  END IF;
END $$;

-- Create policies for reviewer access to orders if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Reviewers can view all orders'
  ) THEN
    CREATE POLICY "Reviewers can view all orders"
      ON orders
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        )
      );
  END IF;
END $$;