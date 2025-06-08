/*
  # Initial Schema Setup

  1. New Tables
    - profiles: User profiles with role management
    - travel_packages: Travel package listings
    - orders: Customer orders
    - message_logs: Communication logs
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
    - Create necessary indexes
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  phone text,
  user_role text DEFAULT 'user' CHECK (user_role IN ('user', 'agent', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create travel_packages table
CREATE TABLE IF NOT EXISTS public.travel_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image text,
  price numeric NOT NULL CHECK (price >= 0),
  duration integer NOT NULL CHECK (duration > 0),
  destination text NOT NULL,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.travel_packages(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  id_card text NOT NULL,
  travel_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_logs table
CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  from_role text NOT NULL CHECK (from_role IN ('user', 'agent')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view approved packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Agents can manage own packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and agents can view related messages" ON public.message_logs;
DROP POLICY IF EXISTS "Users and agents can create messages" ON public.message_logs;

-- Create new policies
CREATE POLICY "Anyone can view approved packages"
  ON public.travel_packages
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Agents can manage own packages"
  ON public.travel_packages
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'agent'
  ));

CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users and agents can view related messages"
  ON public.message_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      LEFT JOIN public.travel_packages tp ON o.package_id = tp.id
      WHERE o.id = message_logs.order_id
      AND (o.user_id = auth.uid() OR tp.agent_id = auth.uid())
    )
  );

CREATE POLICY "Users and agents can create messages"
  ON public.message_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      LEFT JOIN public.travel_packages tp ON o.package_id = tp.id
      WHERE o.id = order_id
      AND (o.user_id = auth.uid() OR tp.agent_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_travel_packages_status ON public.travel_packages(status);
CREATE INDEX IF NOT EXISTS idx_travel_packages_agent_id ON public.travel_packages(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_package_id ON public.orders(package_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_order_id ON public.message_logs(order_id);