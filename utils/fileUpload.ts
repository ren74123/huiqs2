import Taro from '@tarojs/taro';
import { supabaseRequest } from '@/lib/supabase';

/**
 * Upload a file to Supabase Storage
 * @param file File to upload
 * @param bucket Storage bucket name
 * @param userId User ID for the path
 * @param metadata Optional metadata
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  file: any,
  bucket: string,
  userId: string,
  metadata: Record<string, string> = {}
): Promise<string> {
  try {
    // Get current session
    const sessionData = await Taro.getStorage({ key: 'supabase_session' });
    const session = JSON.parse(sessionData.data);
    const token = session.access_token;

    // Generate file path
    const fileExt = file.path.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    
    // Upload file using storage API
    return await supabaseRequest('POST', 'storage/upload_file', {
  body: {
    file,
    bucket,
    fileName,
    token
  }
});
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed. Please try again.');
  }
}

/**
 * Upload ID card image
 * @param file ID card image file
 * @param userId User ID
 * @param orderId Order ID
 * @returns Public URL of the uploaded file
 */
export async function uploadIdCard(
  file: any,
  userId: string,
  orderId: string
): Promise<string> {
  try {
    // Get current session
    const sessionData = await Taro.getStorage({ key: 'supabase_session' });
    const session = JSON.parse(sessionData.data);
    const token = session.access_token;
    
    return await supabaseRequest('POST', 'storage/upload_id_card', {
  body: {
    file,
    userId,
    orderId,
    token
  }
});
  } catch (error) {
    console.error('Error uploading ID card:', error);
    throw new Error('ID card upload failed. Please try again.');
  }
}

/**
 * Upload license image
 * @param file License image file
 * @param userId User ID
 * @returns Public URL of the uploaded file
 */
export async function uploadLicense(
  file: any,
  userId: string
): Promise<string> {
  try {
    // Get current session
    const sessionData = await Taro.getStorage({ key: 'supabase_session' });
    const session = JSON.parse(sessionData.data);
    const token = session.access_token;
    
    return await supabaseRequest('POST', 'storage/upload_license', {
  body: {
    file,
    userId,
    token
  }
});
  } catch (error) {
    console.error('Error uploading license:', error);
    throw new Error('License upload failed. Please try again.');
  }
}

/**
 * Upload avatar image
 * @param file Avatar image file
 * @param userId User ID
 * @returns Public URL of the uploaded file
 */
export async function uploadAvatar(
  file: any,
  userId: string
): Promise<string> {
  try {
    // Get current session
    const sessionData = await Taro.getStorage({ key: 'supabase_session' });
    const session = JSON.parse(sessionData.data);
    const token = session.access_token;
    
    return await supabaseRequest('POST', 'storage/upload_avatar', {
  body: {
    file,
    userId,
    token
  }
});
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw new Error('Avatar upload failed. Please try again.');
  }
}

export default {
  uploadFile,
  uploadIdCard,
  uploadLicense,
  uploadAvatar
};
