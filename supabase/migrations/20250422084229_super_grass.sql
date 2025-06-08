/*
  # Add Banner and Destination Management Tables
  
  1. New Tables
    - `banners`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `image_url` (text, required)
      - `link_url` (text)
      - `is_active` (boolean, default true)
      - `sort_order` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `popular_destinations`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `image_url` (text, required)
      - `link_url` (text)
      - `is_active` (boolean, default true)
      - `sort_order` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create banners table
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create popular_destinations table
CREATE TABLE IF NOT EXISTS public.popular_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_destinations ENABLE ROW LEVEL SECURITY;

-- Create policies for banners
CREATE POLICY "Admins can manage banners"
  ON public.banners
  FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

CREATE POLICY "Anyone can view active banners"
  ON public.banners
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create policies for popular_destinations
CREATE POLICY "Admins can manage popular destinations"
  ON public.popular_destinations
  FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  ));

CREATE POLICY "Anyone can view active popular destinations"
  ON public.popular_destinations
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();

CREATE OR REPLACE FUNCTION update_destinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.popular_destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destinations_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_banners_is_active ON public.banners(is_active);
CREATE INDEX idx_banners_sort_order ON public.banners(sort_order);
CREATE INDEX idx_destinations_is_active ON public.popular_destinations(is_active);
CREATE INDEX idx_destinations_sort_order ON public.popular_destinations(sort_order);