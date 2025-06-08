import { supabase } from '../lib/supabase';

/**
 * Get a signed URL for a file in storage
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @returns A signed URL that can be used to access the file
 */
export async function getSignedFile(bucket: string, path: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting signed file:', error);
      return '';
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed file:', error);
    return '';
  }
}