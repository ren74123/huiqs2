/*
  # Update Agent Package Limit Function
  
  1. Changes
    - Update check_agent_package_limit function to use system settings
    - Get max_travel_packages_per_agent from system_settings table
    - Ensure proper limit enforcement based on admin configuration
*/

-- Create or replace the function to check agent package limit
CREATE OR REPLACE FUNCTION check_agent_package_limit()
RETURNS trigger AS $$
DECLARE
  max_packages integer;
  current_count integer;
BEGIN
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_agent_package_limit_trigger ON travel_packages;

-- Create trigger for package limit
CREATE TRIGGER check_agent_package_limit_trigger
  BEFORE INSERT OR UPDATE OF status ON travel_packages
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION check_agent_package_limit();