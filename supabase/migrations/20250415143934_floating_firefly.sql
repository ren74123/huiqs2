/*
  # Travel Packages Schema

  1. New Tables
    - `travel_packages`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `image` (text)
      - `price` (numeric, required)
      - `duration` (integer, required)
      - `destination` (text, required)
      - `agent_id` (uuid, references profiles)
      - `status` (text: pending/approved/rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on travel_packages table
    - Add policies for:
      - Anyone can view approved packages
      - Agents can manage their own packages
      - Admins can manage all packages
*/

-- Create travel packages table
CREATE TABLE IF NOT EXISTS travel_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image text,
  price numeric NOT NULL CHECK (price >= 0),
  duration integer NOT NULL CHECK (duration > 0),
  destination text NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE travel_packages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can view approved packages
CREATE POLICY "Anyone can view approved packages"
  ON travel_packages
  FOR SELECT
  USING (status = 'approved');

-- Agents can view and manage their own packages
CREATE POLICY "Agents can manage their own packages"
  ON travel_packages
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_travel_packages_updated_at
  BEFORE UPDATE
  ON travel_packages
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_travel_packages_status ON travel_packages(status);
CREATE INDEX idx_travel_packages_agent_id ON travel_packages(agent_id);
CREATE INDEX idx_travel_packages_destination ON travel_packages(destination);