// Environment variables
let Taro: any;
if (process.env.TARO_ENV && process.env.TARO_ENV !== 'h5') {
  Taro = require('@tarojs/taro');
}

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL || 'https://qzvbtrakodqlsdbzbemp.supabase.co';
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dmJ0cmFrb2RxbHNkYnpiZW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQxMDQsImV4cCI6MjA1Nzk3MDEwNH0.LxRnUvWgNEXw6yqTr3SCFi9RzGUcbBjljzPoP15QCIc';

/**
 * Upload file to Supabase Storage
 * @param file File to upload
 * @param bucket Bucket name
 * @param path File path
 * @param token Auth token
 * @returns Uploaded file URL
 */
export async function uploadFile(file: any, bucket: string, path: string, token: string) {
  try {
    let fileData: ArrayBuffer;
    let contentType: string;

    if (file.file) {
      // Web环境 - 使用File对象
      fileData = await file.file.arrayBuffer();
      contentType = file.type || file.file.type || 'application/octet-stream';
    } else if (file.path) {
      // 小程序环境 - 使用文件路径
      const result = Taro.getFileSystemManager().readFileSync(file.path, 'binary');
      if (typeof result === 'string') {
        // 将字符串转换为ArrayBuffer
        const buffer = new ArrayBuffer(result.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < result.length; i++) {
          view[i] = result.charCodeAt(i);
        }
        fileData = buffer;
      } else {
        fileData = result;
      }
      contentType = file.type || 'application/octet-stream';
    } else {
      throw new Error('无效的文件格式 - 缺少file或path属性');
    }

    // 更可靠的环境检测
    const isWeapp = process.env.TARO_ENV && process.env.TARO_ENV !== 'h5';
    
    if (isWeapp && typeof Taro !== 'undefined' && request) {
      // 小程序环境 - 使用request
      const response = await request({
        url: `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
        method: 'POST',
        header: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        data: fileData
      });
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
      } else {
        throw new Error(`Upload failed with status ${response.statusCode}`);
      }
    } else {
      // Web环境 - 使用fetch
      const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        body: fileData
      });
      
      if (response.ok) {
        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
      } else {
        throw new Error(`Upload failed with status ${response.status}`);
      }
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Get signed URL for file
 * @param bucket Bucket name
 * @param path File path
 * @param token Auth token
 * @returns Signed URL
 */
export async function getSignedUrl(bucket: string, path: string, token: string) {
  try {
    const isWeapp = process.env.TARO_ENV && process.env.TARO_ENV !== 'h5';
    
    if (isWeapp && typeof Taro !== 'undefined' && Taro.request) {
      // 小程序环境
      const response = await Taro.request({
        url: `${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`,
        method: 'POST',
        header: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          expiresIn: 3600 // 1 hour
        }
      });
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.data.signedURL;
      } else {
        throw new Error(`Failed to get signed URL with status ${response.statusCode}`);
      }
    } else {
      // Web环境
      const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresIn: 3600 // 1 hour
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.signedURL;
      } else {
        throw new Error(`Failed to get signed URL with status ${response.status}`);
      }
    }
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}

/**
 * Delete file from storage
 * @param bucket Bucket name
 * @param path File path
 * @param token Auth token
 * @returns Success status
 */
export async function deleteFile(bucket: string, path: string, token: string) {
  try {
    const isWeapp = process.env.TARO_ENV && process.env.TARO_ENV !== 'h5';
    
    if (isWeapp && typeof Taro !== 'undefined' && Taro.request) {
      // 小程序环境
      const response = await Taro.request({
        url: `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
        method: 'DELETE',
        header: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`
        }
      });
      return response.statusCode >= 200 && response.statusCode < 300;
    } else {
      // Web环境
      const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Upload ID card
 * @param file File to upload
 * @param userId User ID
 * @param orderId Order ID
 * @param token Auth token
 * @returns Uploaded file path
 */
export async function uploadIdCard(file: any, userId: string, orderId: string, token: string) {
  try {
    // Validate file type (jpg, png, jpeg)
    const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];
    let fileExt = '';
    let fileSize = 0;

    if (file.file) {
      // Web环境
      fileExt = file.name.split('.').pop().toLowerCase();
      fileSize = file.size;
    } else if (file.path) {
      // 小程序环境
      fileExt = file.path.split('.').pop().toLowerCase();
      const fileStats = Taro.getFileSystemManager().statSync(file.path);
      if (!fileStats) {
        throw new Error('无法获取文件信息');
      }
      fileSize = fileStats.size;
    } else {
      throw new Error('无效的文件格式');
    }

    if (!allowedTypes.includes(`image/${fileExt}`)) {
      throw new Error('仅支持JPG、JPEG和PNG格式的文件');
    }

    // Validate file size (max 5MB)
    if (fileSize > 5 * 1024 * 1024) {
      throw new Error(`文件大小(${(fileSize / 1024 / 1024).toFixed(2)}MB)超过5MB限制`);
    }

    const fileName = `${userId}/${orderId}/${Date.now()}.${fileExt}`;
    
    return await uploadFile(file, 'id-cards', fileName, token);
  } catch (error: unknown) {
    console.error('Error uploading ID card:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`ID card upload failed: ${errMsg}`);
  }
}

/**
 * Upload license
 * @param file File to upload
 * @param userId User ID
 * @param token Auth token
 * @returns Uploaded file path
 */
export async function uploadLicense(file: any, userId: string, token: string) {
  try {
    // Get file extension and validate file type
    const allowedTypes = ['jpeg', 'png', 'jpg'];
    let fileExt = '';
    let fileSize = 0;

    if (file.file) {
      // Web环境
      fileExt = file.name.split('.').pop().toLowerCase();
      fileSize = file.size;
      
      // 验证图片有效性
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('文件不是有效的图片'));
        img.src = URL.createObjectURL(file.file);
      });
    } else if (file.path) {
      // 小程序环境
      fileExt = file.path.split('.').pop().toLowerCase();
      const fileStats = Taro.getFileSystemManager().statSync(file.path);
      if (!fileStats) {
        throw new Error('无法获取文件信息');
      }
      fileSize = fileStats.size;
      
      // 验证图片有效性
      try {
        await Taro.getImageInfo({
          src: file.path
        });
      } catch (e) {
        throw new Error('文件不是有效的图片');
      }
    } else {
      throw new Error('无效的文件格式');
    }

    if (!allowedTypes.includes(fileExt)) {
      throw new Error(`仅支持JPG/JPEG/PNG格式的文件，当前文件类型: ${fileExt || '未知'}`);
    }

    // Validate file size (max 5MB)
    if (fileSize > 5 * 1024 * 1024) {
      throw new Error(`文件大小(${(fileSize / 1024 / 1024).toFixed(2)}MB)超过5MB限制`);
    }

    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const url = await uploadFile(file, 'licenses', fileName, token);
    if (!url) {
      throw new Error('上传失败，未返回有效URL');
    }
    return url;
  } catch (error: unknown) {
    console.error('Error uploading license:', error);
    const errMsg = error instanceof Error ? error.message : '未知错误';
    throw new Error(`执照上传失败: ${errMsg}`);
  }
}

/**
 * Upload avatar
 * @param file File to upload
 * @param userId User ID
 * @param token Auth token
 * @returns Uploaded file path
 */
export async function uploadAvatar(file: any, userId: string, token: string) {
  try {
    let fileExt = '';
    if (file.file) {
      // Web环境
      fileExt = file.name.split('.').pop();
    } else if (file.path) {
      // 小程序环境
      fileExt = file.path.split('.').pop();
    } else {
      throw new Error('无效的文件格式');
    }

    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    return await uploadFile(file, 'avatars', fileName, token);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

/**
 * Upload enterprise document
 * @param file File to upload
 * @param userId User ID
 * @param metadata Additional metadata
 * @param token Auth token
 * @returns Uploaded file path
 */
export async function uploadEnterpriseDoc(file: any, userId: string, metadata: any, token: string) {
  try {
    const fileExt = file.path.split('.').pop();
    const fileName = `${userId}/${metadata.doc_type || 'document'}/${Date.now()}.${fileExt}`;
    
    return await uploadFile(file, 'enterprise_docs', fileName, token);
  } catch (error) {
    console.error('Error uploading enterprise document:', error);
    throw error;
  }
}

export default {
  uploadFile,
  getSignedUrl,
  deleteFile,
  uploadIdCard,
  uploadLicense,
  uploadAvatar,
  uploadEnterpriseDoc
};
