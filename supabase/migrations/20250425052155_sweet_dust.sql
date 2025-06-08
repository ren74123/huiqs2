/*
  # Fix Agent Package Limit for Admins
  
  1. Changes
    - Update check_agent_package_limit function to exclude admins
    - Add check for admin role before enforcing package limit
    - Maintain existing functionality for regular agents
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper role-based access control
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS check_agent_package_limit_trigger ON travel_packages;
DROP FUNCTION IF EXISTS check_agent_package_limit CASCADE;

-- Create updated function to check agent package limit
CREATE OR REPLACE FUNCTION check_agent_package_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_packages integer;
  current_count integer;
  is_admin boolean;
BEGIN
  -- Check if the agent is an admin (admins bypass the limit)
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.agent_id
    AND user_role = 'admin'
  ) INTO is_admin;
  
  -- If the agent is an admin, skip the check
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Get the maximum allowed packages from system settings
  SELECT max_travel_packages_per_agent INTO max_packages
  FROM system_settings
  LIMIT 1;
  
  -- If no setting found, use default of 5
  IF max_packages IS NULL THEN
    max_packages := 5;
  END IF;

  -- Count current approved packages for this agent
  SELECT COUNT(*) INTO current_count
  FROM travel_packages
  WHERE agent_id = NEW.agent_id
  AND status = 'approved'
  AND (expire_at IS NULL OR expire_at > CURRENT_DATE)
  AND id != NEW.id; -- Exclude current package being updated
  
  -- Check if limit would be exceeded
  IF current_count >= max_packages THEN
    RAISE EXCEPTION 'Agent cannot have more than % active packages', max_packages;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for package limit
CREATE TRIGGER check_agent_package_limit_trigger
  BEFORE INSERT OR UPDATE OF status ON travel_packages
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION check_agent_package_limit();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_travel_packages_agent_id_status 
ON travel_packages(agent_id, status)
WHERE status = 'approved';