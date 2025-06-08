/*
  # User Credit System
  
  1. New Tables
    - `user_credits`
      - `user_id` (uuid, primary key, references profiles)
      - `total` (integer, default 100)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `type` (text, 'consume' or 'purchase')
      - `amount` (integer)
      - `remark` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for user access control
*/

-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total integer NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('consume', 'purchase')),
  amount integer NOT NULL,
  remark text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credits
CREATE POLICY "Users can view their own credits"
  ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all credits"
  ON public.user_credits
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

-- Create policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all transactions"
  ON public.credit_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_updated_at();

-- Create function to handle new user credits
CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, total)
  VALUES (NEW.id, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize credits for new users
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_credits();

-- Create function to consume credits
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id uuid,
  p_amount integer,
  p_remark text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits integer;
BEGIN
  -- Get current credits
  SELECT total INTO v_current_credits
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF v_current_credits < p_amount THEN
    RETURN false;
  END IF;
  
  -- Update credits
  UPDATE user_credits
  SET total = total - p_amount
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    remark
  ) VALUES (
    p_user_id,
    'consume',
    p_amount,
    p_remark
  );
  
  RETURN true;
END;
$$;

-- Create function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_remark text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update credits
  INSERT INTO user_credits (user_id, total)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET total = user_credits.total + p_amount;
  
  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    remark
  ) VALUES (
    p_user_id,
    'purchase',
    p_amount,
    p_remark
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Initialize credits for existing users
INSERT INTO user_credits (user_id, total)
SELECT id, 100
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_credits WHERE user_credits.user_id = profiles.id
);