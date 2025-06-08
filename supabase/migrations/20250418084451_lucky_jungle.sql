-- Create storage policies for ID cards
CREATE POLICY "Allow admin ID card access"
ON storage.objects FOR SELECT 
TO authenticated
USING (
  bucket_id = 'id-cards' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role = 'admin'
  )
);

-- Fix order status trigger
CREATE OR REPLACE FUNCTION sync_order_status() 
RETURNS trigger AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    -- Update related tables
    UPDATE orders
    SET status = NEW.status
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_order_status_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status();