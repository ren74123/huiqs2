/*
  # Add has_paid_info_fee to enterprise_orders table
  
  1. Changes
    - Add has_paid_info_fee column to enterprise_orders table
    - Set default value to false
    - Create index for better query performance
*/

-- Add has_paid_info_fee column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enterprise_orders' 
    AND column_name = 'has_paid_info_fee'
  ) THEN
    ALTER TABLE enterprise_orders ADD COLUMN has_paid_info_fee boolean DEFAULT false;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_has_paid_info_fee ON enterprise_orders(has_paid_info_fee);