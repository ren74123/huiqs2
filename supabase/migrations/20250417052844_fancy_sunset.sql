/*
  # Refresh Schema Cache
  
  1. Purpose
    - Force refresh of database schema cache
    - Ensure all relationships are properly recognized
    - Update internal metadata
*/

-- Refresh schema cache by touching a system table
SELECT pg_notify('pgrst', 'reload schema');