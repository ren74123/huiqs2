-- Check if policies already exist and drop them if they do
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'info_fee_logs' 
    AND policyname = 'Agents can view their own info fee logs'
  ) THEN
    DROP POLICY "Agents can view their own info fee logs" ON public.info_fee_logs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'info_fee_logs' 
    AND policyname = 'Agents can create their own info fee logs'
  ) THEN
    DROP POLICY "Agents can create their own info fee logs" ON public.info_fee_logs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'info_fee_logs' 
    AND policyname = 'Admins can manage all info fee logs'
  ) THEN
    DROP POLICY "Admins can manage all info fee logs" ON public.info_fee_logs;
  END IF;
END $$;

-- Create info_fee_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.info_fee_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  remark text DEFAULT '信息费'
);

-- Enable RLS
ALTER TABLE public.info_fee_logs ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names to avoid conflicts
CREATE POLICY "agent_view_info_fee_logs_policy"
  ON public.info_fee_logs
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "agent_create_info_fee_logs_policy"
  ON public.info_fee_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "admin_manage_info_fee_logs_policy"
  ON public.info_fee_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_info_fee_logs_order_id ON public.info_fee_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_info_fee_logs_agent_id ON public.info_fee_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_info_fee_logs_created_at ON public.info_fee_logs(created_at);

-- Add has_paid_info_fee column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_paid_info_fee boolean DEFAULT false;

-- Create index for has_paid_info_fee
CREATE INDEX IF NOT EXISTS idx_orders_has_paid_info_fee ON orders(has_paid_info_fee);