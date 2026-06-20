-- Create public storage bucket for vendor logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-logos',
  'vendor-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
CREATE POLICY "vendor logo upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-logos');

-- Anyone can read (public bucket)
CREATE POLICY "vendor logo read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vendor-logos');

-- Authenticated users can update/delete their own uploads
CREATE POLICY "vendor logo update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-logos');

CREATE POLICY "vendor logo delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vendor-logos');
