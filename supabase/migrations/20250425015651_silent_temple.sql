-- Add banner_type column to banners table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' 
    AND column_name = 'banner_type'
  ) THEN
    ALTER TABLE banners ADD COLUMN banner_type text DEFAULT 'travel';
  END IF;
END $$;

-- Update existing banners to have the travel banner_type
UPDATE banners
SET banner_type = 'travel'
WHERE banner_type IS NULL;

-- Create function to send notifications to admins and agents for enterprise orders
CREATE OR REPLACE FUNCTION notify_enterprise_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to all admins
  INSERT INTO messages (
    sender_id,
    content,
    type
  )
  SELECT 
    NEW.user_id,
    '新的企业团建需求已提交，请查看',
    'system'
  FROM profiles
  WHERE user_role = 'admin';

  -- Send notification to all agents
  INSERT INTO messages (
    sender_id,
    receiver_id,
    content,
    type
  )
  SELECT 
    NEW.user_id,
    profiles.id,
    '新的企业团建需求已发布，可以申请接单',
    'system'
  FROM profiles
  WHERE user_role = 'agent';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enterprise order notifications
DROP TRIGGER IF EXISTS notify_enterprise_order_trigger ON enterprise_orders;
CREATE TRIGGER notify_enterprise_order_trigger
  AFTER INSERT ON enterprise_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_enterprise_order();