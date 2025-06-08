/*
  # Disable RLS on message_logs table

  1. Changes
    - Disable row level security on message_logs table temporarily for testing
    
  NOTE: This is a temporary change for testing purposes only.
  Re-enable RLS and implement proper policies before deploying to production!
*/

ALTER TABLE message_logs DISABLE ROW LEVEL SECURITY;