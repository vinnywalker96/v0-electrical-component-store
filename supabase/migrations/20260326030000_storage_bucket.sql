-- Create 'public_uploads' bucket if it doesn't exist, and ensure it is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_uploads', 'public_uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies just in case to prevent duplicates
DROP POLICY IF EXISTS "Public Display" ON storage.objects;
DROP POLICY IF EXISTS "Auth Uploads" ON storage.objects;

-- Allow public read access to the bucket
CREATE POLICY "Public Display" ON storage.objects FOR SELECT USING ( bucket_id = 'public_uploads' );

-- Allow authenticated users to upload files
CREATE POLICY "Auth Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'public_uploads' );
