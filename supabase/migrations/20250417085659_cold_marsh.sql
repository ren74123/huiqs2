/*
  # Add Package Views Increment Function
  
  1. Changes
    - Create function to increment package views
    - Add RPC endpoint for frontend usage
*/

-- Create function to increment package views
CREATE OR REPLACE FUNCTION increment_package_views(package_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE travel_packages
  SET views = views + 1
  WHERE id = package_id;
END;
$$ LANGUAGE plpgsql;