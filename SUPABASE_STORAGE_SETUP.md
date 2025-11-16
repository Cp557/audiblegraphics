# Supabase Storage Setup Guide

This guide explains how to configure the storage buckets and RLS policies for the AudibleSlides application.

## Storage Buckets

You need to create two storage buckets in your Supabase project:

### 1. slide-images

**Configuration:**
- **Bucket Name:** `slide-images`
- **Public:** No (Private bucket)
- **File Size Limit:** 10 MB
- **Allowed MIME Types:** `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

**Storage Path Structure:**
```
{user_id}/{presentation_id}/{slide_id}.jpg
```

### 2. slide-audio

**Configuration:**
- **Bucket Name:** `slide-audio`
- **Public:** No (Private bucket)
- **File Size Limit:** 50 MB
- **Allowed MIME Types:** `audio/mpeg`, `audio/mp3`, `audio/wav`

**Storage Path Structure:**
```
{user_id}/{presentation_id}/{slide_id}.wav
```

## Row Level Security (RLS) Policies

### slide-images Bucket Policies

#### SELECT Policy
**Name:** `Users can read their own slide images`
**Policy:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

#### INSERT Policy
**Name:** `Users can upload their own slide images`
**Policy:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

#### DELETE Policy
**Name:** `Users can delete their own slide images`
**Policy:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

### slide-audio Bucket Policies

#### SELECT Policy
**Name:** `Users can read their own slide audio`
**Policy:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

#### INSERT Policy
**Name:** `Users can upload their own slide audio`
**Policy:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

#### DELETE Policy
**Name:** `Users can delete their own slide audio`
**Policy:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

## How to Apply These Settings

### Creating Buckets (via Supabase Dashboard)

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Enter the bucket name (`slide-images` or `slide-audio`)
4. Set **Public bucket** to OFF
5. Click **Create bucket**
6. Repeat for the second bucket

### Setting Up RLS Policies (via Supabase Dashboard)

1. Go to **Storage** > Click on the bucket name
2. Click on **Policies** tab
3. Click **New policy**
4. Choose the operation type (SELECT, INSERT, or DELETE)
5. Give it a descriptive name
6. Enter the policy expression from above
7. Click **Save**
8. Repeat for all policies on both buckets

### Alternative: SQL Script

You can also create the buckets and policies using SQL:

```sql
-- Create slide-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('slide-images', 'slide-images', false);

-- Create slide-audio bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('slide-audio', 'slide-audio', false);

-- Policies for slide-images
CREATE POLICY "Users can read their own slide images"
ON storage.objects FOR SELECT
USING (bucket_id = 'slide-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own slide images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slide-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own slide images"
ON storage.objects FOR DELETE
USING (bucket_id = 'slide-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policies for slide-audio
CREATE POLICY "Users can read their own slide audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'slide-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own slide audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slide-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own slide audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'slide-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Verification

After setup, verify that:

1. Both buckets appear in Storage dashboard
2. Each bucket has 3 policies (SELECT, INSERT, DELETE)
3. The policies reference the correct bucket_id
4. The folder structure enforcement is working: `(storage.foldername(name))[1] = auth.uid()::text`

## Troubleshooting

### Error: "new row violates row-level security policy"
- Check that the RLS policies are created and enabled
- Verify the user is authenticated
- Ensure the folder structure matches: `{user_id}/{presentation_id}/{slide_id}.ext`

### Error: "Bucket not found"
- Verify bucket names are exactly `slide-images` and `slide-audio`
- Check that buckets are created in the correct Supabase project

### Files not accessible
- Ensure buckets are set to private (not public)
- Check that the service role key is configured in `.env` as `SUPABASE_SERVICE_ROLE_KEY`
- Verify RLS policies allow SELECT operations for authenticated users
