-- Create the policy for public access to report-images bucket
-- Run this in Supabase SQL Editor

-- First, check if the bucket exists
SELECT * FROM storage.buckets WHERE name = 'report-images';

-- If the bucket exists, create the policy
CREATE POLICY IF NOT EXISTS "Allow public access to report-images"
ON storage.objects FOR ALL
USING (bucket_id = 'report-images')
WITH CHECK (bucket_id = 'report-images');

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public access to report-images';
