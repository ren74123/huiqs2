/*
  # Complete Schema Setup

  1. New Tables
    - profiles: User profiles with proper role management
    - travel_packages: Travel package listings
    - orders: Customer orders
    - order_messages: Communication logs
    - agent_applications: Agent application tracking
    - travel_plan_logs: AI-generated travel plans
    - favorites: User's favorite travel plans
  
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

-- Travel packages table
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

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.travel_packages(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_id_card text NOT NULL,
  travel_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order messages table
CREATE TABLE IF NOT EXISTS public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  from_role text NOT NULL CHECK (from_role IN ('user', 'agent')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Agent applications table
CREATE TABLE IF NOT EXISTS public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  license_image text NOT NULL,
  contact_person text NOT NULL,
  contact_phone text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Travel plan logs table
CREATE TABLE IF NOT EXISTS public.travel_plan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  travel_date date NOT NULL,
  days integer NOT NULL CHECK (days > 0),
  plan_text text NOT NULL,
  poi_list jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.travel_plan_logs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_plan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view approved packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Agents can manage their own packages" ON public.travel_packages;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Agents can view orders for their packages" ON public.orders;
DROP POLICY IF EXISTS "Users can view their order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Users can view their own travel plans" ON public.travel_plan_logs;
DROP POLICY IF EXISTS "Users can create travel plans" ON public.travel_plan_logs;
DROP POLICY IF EXISTS "Users can manage their favorites" ON public.favorites;

-- Create new policies
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Anyone can view approved packages"
  ON public.travel_packages
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Agents can manage their own packages"
  ON public.travel_packages
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_role = 'agent'
  ));

CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can view orders for their packages"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travel_packages
    WHERE id = package_id AND agent_id = auth.uid()
  ));

CREATE POLICY "Users can view their order messages"
  ON public.order_messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own applications"
  ON public.agent_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create applications"
  ON public.agent_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own travel plans"
  ON public.travel_plan_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create travel plans"
  ON public.travel_plan_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their favorites"
  ON public.favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.email, new.phone, 'user_' || new.id));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();