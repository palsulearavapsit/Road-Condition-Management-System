-- Fix the report-images bucket setup
-- Run this in Supabase SQL Editor

-- Step 1: Check if bucket exists
SELECT id, name, public FROM storage.buckets WHERE name = 'report-images';

-- Step 2: If it exists but isn't public, make it public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'report-images';

-- Step 3: Create the policy (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public access to report-images'
    ) THEN
        CREATE POLICY "Allow public access to report-images"
        ON storage.objects FOR ALL
        USING (bucket_id = 'report-images')
        WITH CHECK (bucket_id = 'report-images');
    END IF;
END $$;

-- Step 4: Verify everything is set up correctly
SELECT 
    b.name as bucket_name,
    b.public as is_public,
    COUNT(p.policyname) as policy_count
FROM storage.buckets b
LEFT JOIN pg_policies p ON p.tablename = 'objects' 
    AND p.policyname LIKE '%report-images%'
WHERE b.name = 'report-images'
GROUP BY b.name, b.public;
