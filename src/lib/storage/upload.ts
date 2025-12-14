'use server';

import { createAdminClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'blog-images';

export async function uploadBlogImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const file = formData.get('file') as File;
  
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Use JPG, PNG, GIF, or WebP.' };
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File too large. Maximum size is 5MB.' };
  }

  const supabase = createAdminClient();
  
  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

  // Convert File to ArrayBuffer then to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1 year cache
    });

  if (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filename);

  return { success: true, url: urlData.publicUrl };
}

export async function deleteBlogImage(url: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  // Extract filename from URL
  const parts = url.split('/');
  const filename = parts[parts.length - 1];

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filename]);

  if (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}









