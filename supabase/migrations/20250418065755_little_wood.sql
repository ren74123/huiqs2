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
DECLARE
  is_admin boolean;
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

  -- Update application status
  UPDATE agent_applications
  SET 
    status = 'approved',
    review_reason = review_note,
    updated_at = now()
  WHERE id = application_id;

  -- Update user role to agent
  UPDATE profiles
  SET 
    user_role = 'agent',
    updated_at = now()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_agent_application(uuid, uuid, text) 
TO authenticated;