/*
  # Add preferences column to travel_plan_logs table

  1. Changes
    - Add `preferences` column to `travel_plan_logs` table
      - Type: JSONB (to store flexible preference data)
      - Nullable: true (not all plans require preferences)
      - Default: empty JSON object

  2. Reasoning
    - Using JSONB instead of TEXT[] for more flexible preference storage
    - Allows storing structured preference data
    - Maintains backward compatibility with existing records
*/

ALTER TABLE travel_plan_logs 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Update the comment to reflect the new structure
COMMENT ON TABLE travel_plan_logs IS 'Stores user travel plans with preferences and points of interest';