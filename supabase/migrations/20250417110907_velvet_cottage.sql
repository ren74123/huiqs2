/*
  # Create package favorites table

  1. New Tables
    - `package_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `package_id` (uuid, references travel_packages)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `package_favorites` table
    - Add policy for users to manage their own favorites
*/

CREATE TABLE IF NOT EXISTS package_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES travel_packages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create unique constraint to prevent duplicate favorites
ALTER TABLE package_favorites 
  ADD CONSTRAINT package_favorites_user_package_unique 
  UNIQUE (user_id, package_id);

-- Enable RLS
ALTER TABLE package_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own favorites"
  ON package_favorites
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_package_favorites_user_id ON package_favorites(user_id);
CREATE INDEX idx_package_favorites_package_id ON package_favorites(package_id);