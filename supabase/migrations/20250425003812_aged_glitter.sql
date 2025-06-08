/*
  # Enterprise Orders Schema
  
  1. New Tables
    - `enterprise_orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `contact_name` (text, required)
      - `contact_phone` (text, required)
      - `departure_location` (text, required)
      - `destination_location` (text, required)
      - `travel_date` (date, required)
      - `people_count` (integer, optional)
      - `requirements` (text, optional)
      - `status` (text: pending/approved/completed/rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `enterprise_order_applications`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references enterprise_orders)
      - `agent_id` (uuid, references profiles)
      - `license_image` (text, required)
      - `qualification_image` (text, required)
      - `status` (text: pending/approved/rejected)
      - `review_reason` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for user access control
*/

-- Create enterprise_orders table
CREATE TABLE IF NOT EXISTS public.enterprise_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  departure_location text NOT NULL,
  destination_location text NOT NULL,
  travel_date date NOT NULL,
  people_count integer,
  requirements text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enterprise_order_applications table
CREATE TABLE IF NOT EXISTS public.enterprise_order_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES enterprise_orders(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  license_image text NOT NULL,
  qualification_image text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enterprise_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_order_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for enterprise_orders
CREATE POLICY "Users can view their own enterprise orders"
  ON public.enterprise_orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create enterprise orders"
  ON public.enterprise_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all enterprise orders"
  ON public.enterprise_orders
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

CREATE POLICY "Agents can view enterprise orders"
  ON public.enterprise_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'agent'
    )
  );

-- Create policies for enterprise_order_applications
CREATE POLICY "Agents can manage their own applications"
  ON public.enterprise_order_applications
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Admins can manage all applications"
  ON public.enterprise_order_applications
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_enterprise_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_orders_updated_at
  BEFORE UPDATE ON public.enterprise_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_orders_updated_at();

CREATE OR REPLACE FUNCTION update_enterprise_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_applications_updated_at
  BEFORE UPDATE ON public.enterprise_order_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_enterprise_applications_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_user_id ON public.enterprise_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_orders_status ON public.enterprise_orders(status);
CREATE INDEX IF NOT EXISTS idx_enterprise_applications_order_id ON public.enterprise_order_applications(order_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_applications_agent_id ON public.enterprise_order_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_applications_status ON public.enterprise_order_applications(status);