-- Add preferences column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'travel_plan_logs' 
    AND column_name = 'preferences'
  ) THEN
    ALTER TABLE travel_plan_logs 
    ADD COLUMN preferences text[] DEFAULT '{}';
  END IF;
END $$;

-- Ensure poi_list has a default value
ALTER TABLE travel_plan_logs 
ALTER COLUMN poi_list SET DEFAULT '[]'::jsonb;

-- Add comment to document the table structure
COMMENT ON TABLE travel_plan_logs IS 'Stores user travel plans with preferences and points of interest';

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');