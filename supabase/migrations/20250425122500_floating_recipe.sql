/*
  # Add Order Number Field to Orders Table
  
  1. Changes
    - Add order_number column to orders table
    - Add unique constraint to ensure uniqueness
    - Create index for better query performance
*/

-- Add order_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number text;
  END IF;
END $$;

-- Add unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_order_number_key'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part text;
  sequence_number int;
  new_order_number text;
BEGIN
  -- Get current date in YYYYMMDD format
  date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Get the latest sequence number for today
  SELECT COALESCE(MAX(SUBSTRING(order_number, 11)::integer), 0) INTO sequence_number
  FROM orders
  WHERE order_number LIKE 'DD' || date_part || '%';
  
  -- Increment sequence number
  sequence_number := sequence_number + 1;
  
  -- Format new order number: DD + YYYYMMDD + 4-digit sequence
  new_order_number := 'DD' || date_part || LPAD(sequence_number::text, 4, '0');
  
  -- Set the new order number
  NEW.order_number := new_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate order number on insert
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Generate order numbers for existing orders that don't have one
DO $$
DECLARE
  order_rec RECORD;
  date_part text;
  sequence_number int := 0;
  new_order_number text;
BEGIN
  FOR order_rec IN 
    SELECT id, created_at 
    FROM orders 
    WHERE order_number IS NULL
    ORDER BY created_at
  LOOP
    -- Get date in YYYYMMDD format from created_at
    date_part := to_char(order_rec.created_at, 'YYYYMMDD');
    
    -- Increment sequence number
    sequence_number := sequence_number + 1;
    
    -- Format order number
    new_order_number := 'DD' || date_part || LPAD(sequence_number::text, 4, '0');
    
    -- Update the order
    UPDATE orders
    SET order_number = new_order_number
    WHERE id = order_rec.id;
  END LOOP;
END $$;