-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Database Storage Configuration & Storage RLS Policies

-- =========================================================================
-- 1. Initialize Private Storage Bucket
-- =========================================================================

-- Seed private bucket for medical claims receipts and discharge letters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-documents',
  'claim-documents',
  false,                 -- Private bucket (requires signed URLs to read)
  5242880,               -- 5MB size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- =========================================================================
-- 2. Storage Objects Row Level Security Policies
-- =========================================================================

-- Helper function to extract employee/owner UUID from the storage path
-- Assumed upload path format: claims/{employee_id}/{claim_id}/{filename}
CREATE OR REPLACE FUNCTION get_owner_id_from_path(name TEXT)
RETURNS UUID AS $$
BEGIN
  -- Split string and return the 2nd path element
  -- e.g. split 'claims/58c92133-.../c-123/receipt.pdf' -> '58c92133-...'
  RETURN (string_to_array(name, '/'))[2]::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to extract claim UUID from the storage path
CREATE OR REPLACE FUNCTION get_claim_id_from_path(name TEXT)
RETURNS UUID AS $$
BEGIN
  -- Split string and return the 3rd path element
  RETURN (string_to_array(name, '/'))[3]::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Select (Download/Read Documents)
-- Access is granted if:
-- 1. User is the owner of the folder path (matches employee_id)
-- 2. User is a reviewing officer in the same district as the claimant
-- 3. User is an Administrator or Treasury officer
CREATE POLICY download_claim_docs ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-documents' AND (
      get_owner_id_from_path(name) = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
          AND p.role IN ('Medical Officer', 'Accounts Officer', 'DDO')
          AND p.district = (SELECT district FROM public.profiles WHERE id = get_owner_id_from_path(name))
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
          AND p.role IN ('Treasury', 'Administrator')
      )
    )
  );

-- Policy: Insert (Upload Documents)
-- Allowed if the user is uploading to their own folder path
CREATE POLICY upload_claim_docs ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-documents' AND
    get_owner_id_from_path(name) = auth.uid()
  );

-- Policy: Delete (Remove Documents)
-- Only allowed if:
-- 1. User owns the file folder path
-- 2. The associated claim is in 'Draft' or 'Returned for Correction' status
CREATE POLICY delete_claim_docs ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'claim-documents' AND
    get_owner_id_from_path(name) = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.claims c 
      WHERE c.id = get_claim_id_from_path(name) 
        AND c.status IN ('Draft', 'Returned for Correction')
    )
  );
