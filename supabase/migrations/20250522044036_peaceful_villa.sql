-- Create session_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.session_tokens (
  session_id text PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  inserted_at timestamptz DEFAULT timezone('utc', now())
);

-- Add columns for Alipay integration if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_tokens' 
    AND column_name = 'out_trade_no'
  ) THEN
    ALTER TABLE session_tokens ADD COLUMN out_trade_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_tokens' 
    AND column_name = 'trade_no'
  ) THEN
    ALTER TABLE session_tokens ADD COLUMN trade_no text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_tokens' 
    AND column_name = 'trade_status'
  ) THEN
    ALTER TABLE session_tokens ADD COLUMN trade_status text;
  END IF;
END $$;

-- Disable RLS for session_tokens table
ALTER TABLE public.session_tokens DISABLE ROW LEVEL SECURITY;