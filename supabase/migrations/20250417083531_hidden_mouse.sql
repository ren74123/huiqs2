DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_packages' 
    AND column_name = 'review_note'
  ) THEN
    ALTER TABLE travel_packages 
    ADD COLUMN review_note text;
  END IF;
END $$;