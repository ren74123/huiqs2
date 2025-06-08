-- Add read column to message_logs table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_logs' 
    AND column_name = 'read'
  ) THEN
    ALTER TABLE message_logs ADD COLUMN read boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_message_logs_read ON message_logs(read);