import { supabase } from '@/lib/supabase'; // 必须启用 autoRefreshToken
import {
  uploadAvatar as uploadAvatarApi,
  uploadFile,
  uploadIdCard as uploadIdCardApi,
  uploadLicense as uploadLicenseApi
} from '@/api/storageRest';

/**
 * 获取当前有效 Supabase token 和用户 ID
 */
async function getAccessToken(): Promise<{ token: string; userId: string }> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('未登录或 session 获取失败');
  }

  const token = data.session.access_token;
  const userId = data.session.user.id;

  if (!token || !userId) throw new Error('登录信息已失效');

  return { token, userId };
}

/**
 * 上传头像文件
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const { token, userId } = await getAccessToken();
    return await uploadAvatarApi(file, userId, token, {
      allowedTypes: ['image/jpeg', 'image/png'],
      maxSizeMB: 5,
      onProgress
    });
  } catch (error: any) {
    console.error('❌ 上传头像失败:', error);
    throw new Error(error?.message || '头像上传失败，请重试');
  }
}

/**
 * 上传身份证文件
 */
export async function uploadIdCard(
  file: File,
  orderId: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const { token, userId } = await getAccessToken();
    return await uploadIdCardApi(file, userId, orderId, token, {
      allowedTypes: ['image/jpeg', 'image/png'],
      maxSizeMB: 5,
      onProgress
    });
  } catch (error: any) {
    console.error('❌ 上传身份证失败:', error);
    throw new Error(error?.message || '身份证上传失败，请重试');
  }
}

/**
 * 上传许可证（营业执照）文件
 */
export async function uploadLicense(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const { token, userId } = await getAccessToken();
    return await uploadLicenseApi(file, userId, token, {
      allowedTypes: ['image/jpeg', 'image/png'],
      maxSizeMB: 5,
      onProgress
    });
  } catch (error: any) {
    console.error('❌ 上传许可证失败:', error);
    throw new Error(error?.message || '许可证上传失败，请重试');
  }
}

/**
 * 上传通用文件（支持指定 bucket、folder、文件名）
 */
export async function uploadGeneral(
  file: File,
  bucket: string,
  folder?: string,
  filename?: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const { token, userId } = await getAccessToken();

    const targetFolder = folder || userId;
    const fileExt = file.name.split('.').pop();
    const finalFilename =
      filename || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${targetFolder}/${finalFilename}`;

    return await uploadFile(file, bucket, filePath, token, {
      allowedTypes: ['image/jpeg', 'image/png'],
      maxSizeMB: 5,
      onProgress
    });
  } catch (error: any) {
    console.error('❌ 通用文件上传失败:', error);
    throw new Error(error?.message || '文件上传失败，请重试');
  }
}

/**
 * 默认导出（用于批量导入）
 */
export default {
  uploadAvatar,
  uploadIdCard,
  uploadLicense,
  uploadGeneral
};
