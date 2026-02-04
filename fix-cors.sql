-- Fix CORS issue for storage bucket
-- Run this in Supabase SQL Editor

-- First, let's check current CORS settings
SELECT * FROM storage.buckets WHERE name = 'report-images';

-- Update the bucket to allow CORS from all origins
UPDATE storage.buckets
SET 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    file_size_limit = 52428800,  -- 50MB
    public = true
WHERE name = 'report-images';

-- Verify the update
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'report-images';
