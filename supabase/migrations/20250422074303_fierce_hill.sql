/*
  # Add Contract Status to Orders Table
  
  1. Changes
    - Add contract_status column to orders table
    - Add constraint to ensure valid status values
    - Create index for better query performance
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add contract_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'contract_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN contract_status text;
  END IF;
END $$;

-- Add constraint to ensure valid status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'orders' 
    AND constraint_name = 'orders_contract_status_check'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_contract_status_check 
    CHECK (contract_status IS NULL OR contract_status IN ('pending', 'confirmed', 'rejected'));
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_contract_status ON orders(contract_status);

-- Create function to handle contract confirmation
CREATE OR REPLACE FUNCTION confirm_contract(
  p_order_id uuid,
  p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  -- Check if the executing user is an admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id
    AND user_role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN false;
  END IF;

  -- Get the user ID from the order
  SELECT user_id INTO v_user_id
  FROM orders
  WHERE id = p_order_id;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update order contract status
  UPDATE orders
  SET 
    contract_status = 'confirmed',
    updated_at = now()
  WHERE id = p_order_id;

  -- Add credits to user
  PERFORM add_credits(
    v_user_id,
    200,
    '线下签约确认奖励'
  );

  RETURN true;
END;
$$;