/*
  # Add process_alipay_payment function
  
  1. Changes
    - Create a function to process Alipay payments in a transaction
    - Ensure atomicity when updating payment status and adding credits
    - Prevent duplicate processing of the same payment
*/

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