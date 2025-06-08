-- Create function to handle agent application approval
CREATE OR REPLACE FUNCTION approve_agent_application(
  application_id uuid,
  user_id uuid,
  review_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update application status
  UPDATE agent_applications
  SET 
    status = 'approved',
    review_reason = review_note
  WHERE id = application_id;

  -- Update user role to agent
  UPDATE profiles
  SET user_role = 'agent'
  WHERE id = user_id;
END;
$$;

-- Add policy for admin access
ALTER FUNCTION approve_agent_application(uuid, uuid, text) 
SET SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_agent_application(uuid, uuid, text) 
TO authenticated;