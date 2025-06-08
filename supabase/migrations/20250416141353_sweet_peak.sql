/*
  # Fix Messages Table Schema

  1. Changes
    - Create messages table with correct column names and references
    - Enable RLS
    - Add appropriate policies
    - Create necessary indexes

  2. Security
    - Enable RLS on messages table
    - Add policies for message access control
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  type text DEFAULT 'text',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  priority message_priority DEFAULT 'normal',
  category message_category DEFAULT 'chat',
  parent_message_id uuid REFERENCES public.messages(id),
  context_data jsonb DEFAULT '{}'::jsonb,
  ai_analysis jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can access messages from their conversations" ON public.messages;

-- Create new policy
CREATE POLICY "Users can view conversation messages"
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);