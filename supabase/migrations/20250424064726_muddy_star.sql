/*
  # Add Reviewer Role to System
  
  1. Changes
    - Update user_role check constraint to include 'reviewer' role
    - Add reviewer role to role_type check constraint
    - Update existing policies to include reviewer role where appropriate
*/

-- Update user_role check constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_user_role_check'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_user_role_check;
  END IF;
END $$;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_role_check 
CHECK (user_role IN ('user', 'agent', 'admin', 'reviewer'));

-- Update role_type check constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_type_check'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_type_check;
  END IF;
END $$;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_type_check 
CHECK (role_type IN ('user', 'agent', 'admin', 'reviewer'));

-- Create policies for reviewer access to travel_packages
CREATE POLICY "Reviewers can manage all packages"
  ON travel_packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'reviewer'
    )
  );

-- Create policies for reviewer access to agent_applications
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

-- Create policies for reviewer access to agent_applications
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