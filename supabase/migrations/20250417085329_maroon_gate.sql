/*
  # Add Package Statistics Fields
  
  1. Changes
    - Add views counter
    - Add orders counter
    - Add favorites counter
    - Add hot score field
    - Create function to update hot score
*/

-- Add statistics columns if they don't exist
DO $$ 
BEGIN
  -- Add views counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' AND column_name = 'views'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN views integer DEFAULT 0;
  END IF;

  -- Add orders counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' AND column_name = 'orders'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN orders integer DEFAULT 0;
  END IF;

  -- Add favorites counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' AND column_name = 'favorites'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN favorites integer DEFAULT 0;
  END IF;

  -- Add hot score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' AND column_name = 'hot_score'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN hot_score numeric DEFAULT 0;
  END IF;
END $$;

-- Create function to calculate hot score
CREATE OR REPLACE FUNCTION calculate_hot_score()
RETURNS trigger AS $$
BEGIN
  -- Calculate hot score based on weighted metrics
  NEW.hot_score = (
    COALESCE(NEW.views, 0) * 1 + 
    COALESCE(NEW.orders, 0) * 3 + 
    COALESCE(NEW.favorites, 0) * 2
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update hot score
DROP TRIGGER IF EXISTS update_hot_score ON travel_packages;
CREATE TRIGGER update_hot_score
  BEFORE INSERT OR UPDATE OF views, orders, favorites
  ON travel_packages
  FOR EACH ROW
  EXECUTE FUNCTION calculate_hot_score();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_travel_packages_hot_score ON travel_packages(hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_travel_packages_views ON travel_packages(views DESC);
CREATE INDEX IF NOT EXISTS idx_travel_packages_orders ON travel_packages(orders DESC);
CREATE INDEX IF NOT EXISTS idx_travel_packages_favorites ON travel_packages(favorites DESC);