import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

function getSupabaseWithToken(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

interface UploadOptions {
  allowedTypes?: string[];
  maxSizeMB?: number;
  onProgress?: (percent: number) => void;
}

/**
 * 通用上传函数（含校验与进度回调）
 */
export async function uploadFile(
  file: File,
  bucket: string,
  path: string,
  token: string,
  options?: UploadOptions
): Promise<string> {
  const allowedTypes = options?.allowedTypes ?? ['image/jpeg', 'image/png'];
  const maxSizeMB = options?.maxSizeMB ?? 5;

  if (!allowedTypes.includes(file.type)) {
    throw new Error('仅支持 JPG / PNG 格式');
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`文件大小不能超过 ${maxSizeMB}MB`);
  }

  const supabase = getSupabaseWithToken(token);

const { error } = await supabase.storage
  .from(bucket)
  .upload(path, file, {
    upsert: true,
    contentType: file.type
  });


  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * 获取文件签名地址
 */
export async function getSignedUrl(bucket: string, path: string, token: string) {
  const supabase = getSupabaseWithToken(token);
  const { data: { signedUrl }, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return signedUrl;
}

/**
 * 删除文件
 */
export async function deleteFile(bucket: string, path: string, token: string) {
  const supabase = getSupabaseWithToken(token);
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  if (error) throw error;
  return true;
}

/**
 * 上传身份证图片
 */
export async function uploadIdCard(
  file: File,
  userId: string,
  orderId: string,
  token: string,
  options?: UploadOptions
) {
  try {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${orderId}/${Date.now()}.${ext}`;
    return await uploadFile(file, 'id-cards', filePath, token, options);
  } catch (err) {
    console.error('Error uploading ID card:', err);
    throw err;
  }
}

/**
 * 上传营业执照
 */
export async function uploadLicense(
  file: File,
  userId: string,
  token: string,
  options?: UploadOptions
) {
  try {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;
    return await uploadFile(file, 'licenses', filePath, token, options);
  } catch (err) {
    console.error('Error uploading license:', err);
    throw err;
  }
}

/**
 * 上传头像
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  token: string,
  options?: UploadOptions
) {
  try {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
    return await uploadFile(file, 'avatars', filePath, token, options);
  } catch (err) {
    console.error('Error uploading avatar:', err);
    throw err;
  }
}

export default {
  uploadFile,
  getSignedUrl,
  deleteFile,
  uploadIdCard,
  uploadLicense,
  uploadAvatar
};
