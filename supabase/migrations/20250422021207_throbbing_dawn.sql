/*
  # Add Package Reviews Schema
  
  1. New Tables
    - `package_reviews`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `package_id` (uuid, references travel_packages)
      - `rating` (integer, 1-5)
      - `comment` (text, optional)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for user access control
    - Create indexes for better performance
    
  3. Features
    - Add average_rating to travel_packages
    - Create trigger to update average rating on review changes
*/

-- Create package reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.package_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES travel_packages(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, package_id)
);

-- Enable RLS
ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'package_reviews' 
    AND policyname = 'Users can manage their own reviews'
  ) THEN
    DROP POLICY "Users can manage their own reviews" ON public.package_reviews;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'package_reviews' 
    AND policyname = 'Anyone can view reviews'
  ) THEN
    DROP POLICY "Anyone can view reviews" ON public.package_reviews;
  END IF;
END $$;

-- Create policies
CREATE POLICY "Users can manage their own reviews"
  ON public.package_reviews
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view reviews"
  ON public.package_reviews
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_reviews_package_id ON public.package_reviews(package_id);
CREATE INDEX IF NOT EXISTS idx_package_reviews_user_id ON public.package_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_package_reviews_rating ON public.package_reviews(rating);

-- Create function to update average rating on travel_packages
CREATE OR REPLACE FUNCTION update_package_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  -- Calculate new average rating
  SELECT AVG(rating)::NUMERIC(3,1) INTO avg_rating
  FROM package_reviews
  WHERE package_id = COALESCE(NEW.package_id, OLD.package_id);
  
  -- Update the travel_package
  UPDATE travel_packages
  SET average_rating = avg_rating
  WHERE id = COALESCE(NEW.package_id, OLD.package_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add average_rating column to travel_packages if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE travel_packages ADD COLUMN average_rating NUMERIC(3,1);
  END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_package_rating ON package_reviews;

-- Create trigger to update average rating
CREATE TRIGGER update_package_rating
  AFTER INSERT OR UPDATE OR DELETE ON package_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_package_average_rating();

-- Create index for average_rating
CREATE INDEX IF NOT EXISTS idx_travel_packages_average_rating ON travel_packages(average_rating DESC);