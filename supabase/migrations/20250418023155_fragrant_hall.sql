/*
  # Add Review Reason Column
  
  1. Changes
    - Add review_reason column to agent_applications table
    - Store admin review notes for approvals/rejections
*/

-- Add review_reason column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'agent_applications' 
    AND column_name = 'review_reason'
  ) THEN
    ALTER TABLE agent_applications 
    ADD COLUMN review_reason text;
  END IF;
END $$;