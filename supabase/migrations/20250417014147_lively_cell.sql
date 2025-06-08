/*
  # Fix Messages Table Schema

  1. Changes
    - Drop existing messages table
    - Create new messages table with correct structure
    - Add foreign key constraints
    - Enable RLS with appropriate policies

  2. Security
    - Enable RLS
    - Add policies for message access control
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.messages CASCADE;

-- Create messages table
CREATE TABLE public.messages (
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
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
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