/*
  # Fix Reviewer Access to Admin Pages
  
  1. Changes
    - Add RLS policies to allow reviewers to access travel_packages
    - Add RLS policies to allow reviewers to access agent_applications
    - Ensure reviewers can view and manage packages and applications
    - Limit reviewers to only see pending items
  
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
    AND policyname = 'Reviewers can manage pending packages'
  ) THEN
    CREATE POLICY "Reviewers can manage pending packages"
      ON travel_packages
      FOR ALL
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        ) AND status = 'pending'
      );
  END IF;
END $$;

-- Create policies for reviewer access to agent_applications if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_applications' 
    AND policyname = 'Reviewers can view pending applications'
  ) THEN
    CREATE POLICY "Reviewers can view pending applications"
      ON agent_applications
      FOR SELECT
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() 
          AND profiles.user_role = 'reviewer'
        ) AND status = 'pending'
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agent_applications' 
    AND policyname = 'Reviewers can update pending applications'
  ) THEN
    CREATE POLICY "Reviewers can update pending applications"
      ON agent_applications
      FOR UPDATE
      TO authenticated
      USING (
        (
          (current_setting('request.jwt.claims', true)::json ->> 'user_role') = 'reviewer'
          AND status = 'pending'
        )
      )
      WITH CHECK (
        (current_setting('request.jwt.claims', true)::json ->> 'user_role') = 'reviewer'
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

-- Create policy for travel packages update by reviewers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'travel_packages' 
    AND policyname = 'Reviewers can update pending packages'
  ) THEN
    CREATE POLICY "Reviewers can update pending packages"
      ON travel_packages
      FOR UPDATE
      TO authenticated
      USING (
        (
          (current_setting('request.jwt.claims', true)::json ->> 'user_role') = 'reviewer'
          AND status = 'pending'
        )
      )
      WITH CHECK (
        (current_setting('request.jwt.claims', true)::json ->> 'user_role') = 'reviewer'
      );
  END IF;
END $$;