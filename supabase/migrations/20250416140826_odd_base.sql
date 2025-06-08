/*
  # Update Messages System Schema
  
  1. Changes
    - Drop existing policy to avoid conflicts
    - Add new policy for conversation-based message access
    - Create indexes for better performance
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can access messages from their conversations" ON public.messages;

-- Create new policy
CREATE POLICY "Users can access messages from their conversations"
  ON public.messages
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 
      FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);