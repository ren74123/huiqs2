/*
  # Travel Packages and Orders Schema
  
  1. Changes
    - Create travel packages and orders tables
    - Add RLS policies
    - Create indexes for better performance
*/

-- Create travel packages table
CREATE TABLE IF NOT EXISTS public.travel_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    image text,
    price numeric NOT NULL CHECK (price >= 0),
    duration integer NOT NULL CHECK (duration > 0),
    destination text NOT NULL,
    agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id uuid REFERENCES travel_packages(id) ON DELETE CASCADE,
    contact_name text NOT NULL,
    contact_phone text NOT NULL,
    travel_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view approved packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Agents can manage their own packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Admins can manage all packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Users can view and create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Agents can view their package orders" ON public.orders;

-- Travel packages policies
CREATE POLICY "Anyone can view approved packages"
    ON public.travel_packages
    FOR SELECT
    USING (status = 'approved');

CREATE POLICY "Agents can manage their own packages"
    ON public.travel_packages
    FOR ALL
    USING (agent_id = auth.uid())
    WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Admins can manage all packages"
    ON public.travel_packages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.user_role = 'admin'
    ));

-- Order policies
CREATE POLICY "Users can view and create their own orders"
    ON public.orders
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can view their package orders"
    ON public.orders
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.travel_packages
        WHERE travel_packages.id = orders.package_id
        AND travel_packages.agent_id = auth.uid()
    ));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_travel_packages_updated_at ON public.travel_packages;
CREATE TRIGGER update_travel_packages_updated_at
    BEFORE UPDATE ON public.travel_packages
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for better performance
DROP INDEX IF EXISTS idx_travel_packages_status;
DROP INDEX IF EXISTS idx_travel_packages_agent_id;
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_orders_package_id;
DROP INDEX IF EXISTS idx_orders_status;

CREATE INDEX idx_travel_packages_status ON public.travel_packages(status);
CREATE INDEX idx_travel_packages_agent_id ON public.travel_packages(agent_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_package_id ON public.orders(package_id);
CREATE INDEX idx_orders_status ON public.orders(status);