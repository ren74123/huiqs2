-- Add policies for admin access to agent applications
CREATE POLICY "Admins can view all applications"
  ON agent_applications
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_applications_status 
ON agent_applications(status);

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS idx_agent_applications_user_id 
ON agent_applications(user_id);