-- Create credit_purchases table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  credits integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add columns for Alipay integration if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_purchases' 
    AND column_name = 'amount'
  ) THEN
    ALTER TABLE credit_purchases ADD COLUMN amount numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_purchases' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE credit_purchases ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_purchases' 
    AND column_name = 'alipay_trade_no'
  ) THEN
    ALTER TABLE credit_purchases ADD COLUMN alipay_trade_no text;
  END IF;
END $$;

-- Add constraint for payment_status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'credit_purchases_payment_status_check'
    AND table_name = 'credit_purchases'
  ) THEN
    ALTER TABLE credit_purchases 
    ADD CONSTRAINT credit_purchases_payment_status_check 
    CHECK (payment_status IN ('pending', 'completed', 'failed'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_purchases' 
    AND policyname = 'Users can insert their own credit purchases'
  ) THEN
    CREATE POLICY "Users can insert their own credit purchases"
      ON public.credit_purchases
      FOR INSERT
      TO public
      WITH CHECK (uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_purchases' 
    AND policyname = 'Users can view their own credit purchases'
  ) THEN
    CREATE POLICY "Users can view their own credit purchases"
      ON public.credit_purchases
      FOR SELECT
      TO public
      USING (uid() = user_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_payment_status ON public.credit_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_created_at ON public.credit_purchases(created_at);