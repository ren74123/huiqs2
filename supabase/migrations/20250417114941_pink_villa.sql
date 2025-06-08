/*
  # Package Favorites Schema

  1. Changes
    - Drop existing constraints and policies to avoid conflicts
    - Create package_favorites table with proper constraints
    - Add RLS policies for user access control
    - Create indexes for better performance
    - Add trigger for favorites count updates
*/

-- Drop existing objects to avoid conflicts
DO $$ 
BEGIN
  -- Drop constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'package_favorites_user_package_unique'
    AND table_name = 'package_favorites'
  ) THEN
    ALTER TABLE package_favorites DROP CONSTRAINT package_favorites_user_package_unique;
  END IF;

  -- Drop policy if exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'package_favorites_user_management_policy'
    AND tablename = 'package_favorites'
  ) THEN
    DROP POLICY IF EXISTS "package_favorites_user_management_policy" ON package_favorites;
  END IF;
END $$;

-- Create favorites table if not exists
CREATE TABLE IF NOT EXISTS package_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES travel_packages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint
ALTER TABLE package_favorites 
  ADD CONSTRAINT package_favorites_user_package_unique_new 
  UNIQUE (user_id, package_id);

-- Enable RLS
ALTER TABLE package_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names
CREATE POLICY "package_favorites_user_access_policy"
  ON package_favorites
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_package_favorites_user_id ON package_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_package_favorites_package_id ON package_favorites(package_id);

-- Create function to update favorites count
CREATE OR REPLACE FUNCTION update_package_favorites()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE travel_packages 
    SET favorites = favorites + 1
    WHERE id = NEW.package_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE travel_packages 
    SET favorites = favorites - 1
    WHERE id = OLD.package_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for favorites count
DROP TRIGGER IF EXISTS update_package_favorites_count ON package_favorites;
CREATE TRIGGER update_package_favorites_count
  AFTER INSERT OR DELETE ON package_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_package_favorites();