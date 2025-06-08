-- Create credit_purchases table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  credits integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  amount numeric(10,2),
  payment_status text DEFAULT 'pending',
  alipay_trade_no text
);

-- Check if constraint exists before adding it
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_payment_status ON public.credit_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_created_at ON public.credit_purchases(created_at);

-- Create function to process Alipay payments in a transaction
CREATE OR REPLACE FUNCTION process_alipay_payment(
  p_order_id uuid,
  p_alipay_trade_no text,
  p_user_id uuid,
  p_credits integer,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Check if payment has already been processed (idempotency)
  SELECT payment_status INTO v_current_status
  FROM credit_purchases
  WHERE id = p_order_id;
  
  IF v_current_status = 'completed' THEN
    -- Payment already processed, return success
    RETURN true;
  END IF;
  
  -- Begin transaction
  BEGIN
    -- Update credit_purchases status
    UPDATE credit_purchases
    SET 
      payment_status = 'completed',
      alipay_trade_no = p_alipay_trade_no
    WHERE id = p_order_id;
    
    -- Add credits to user
    PERFORM add_credits(
      p_user_id,
      p_credits,
      p_description
    );
    
    -- Commit transaction
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on error
    RAISE;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_alipay_payment(uuid, text, uuid, integer, text) 
TO authenticated;