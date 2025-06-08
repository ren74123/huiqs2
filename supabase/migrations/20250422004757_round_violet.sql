/*
  # Add Travel Agency ID to Agent Applications
  
  1. Changes
    - Add agency_id column to agent_applications table
    - Create function to generate unique 10-digit agency IDs
    - Add trigger to automatically generate agency_id on insert
    - Update existing applications with generated IDs
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add agency_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_applications' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE agent_applications ADD COLUMN agency_id text;
  END IF;
END $$;

-- Create function to generate unique agency ID
CREATE OR REPLACE FUNCTION generate_agency_id()
RETURNS text AS $$
DECLARE
  new_id text;
  exists_already boolean;
BEGIN
  LOOP
    -- Generate a random 10-digit number
    new_id := lpad(floor(random() * 10000000000)::text, 10, '0');
    
    -- Check if this ID already exists
    SELECT EXISTS (
      SELECT 1 FROM agent_applications WHERE agency_id = new_id
    ) INTO exists_already;
    
    -- If it doesn't exist, return it
    IF NOT exists_already THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate agency_id on insert
CREATE OR REPLACE FUNCTION set_agency_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := generate_agency_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_agency_id_trigger ON agent_applications;

-- Create trigger
CREATE TRIGGER set_agency_id_trigger
  BEFORE INSERT ON agent_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_agency_id();

-- Update existing applications with generated IDs
UPDATE agent_applications
SET agency_id = generate_agency_id()
WHERE agency_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agent_applications_agency_id ON agent_applications(agency_id);

-- Add agency_id column to profiles table to store it after approval
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN agency_id text;
  END IF;
END $$;

-- Update approve_agent_application function to copy agency_id to profiles
CREATE OR REPLACE FUNCTION approve_agent_application(
  application_id uuid,
  user_id uuid,
  review_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  v_agency_id text;
BEGIN
  -- Check if the executing user is an admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can approve applications';
  END IF;

  -- Get the agency_id from the application
  SELECT agency_id INTO v_agency_id
  FROM agent_applications
  WHERE id = application_id;

  -- Update application status
  UPDATE agent_applications
  SET 
    status = 'approved',
    review_reason = review_note,
    updated_at = now()
  WHERE id = application_id;

  -- Update user role to agent and copy agency_id
  UPDATE profiles
  SET 
    user_role = 'agent',
    agency_id = v_agency_id,
    updated_at = now()
  WHERE id = user_id;

  -- Send notification
  INSERT INTO messages 
    (sender_id, receiver_id, content, type)
  VALUES 
    (auth.uid(), user_id, '🎉 恭喜，您的旅行社申请已通过审核！现在您可以发布和管理旅行套餐了。', 'system');
END;
$$;