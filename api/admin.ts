import request from '@/api/request';

export async function listUsers(searchTerm: string) {
  try {
    const response = await request({
      url: '/api/admin/users',
      method: 'GET',
      params: {
        searchTerm
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error listing users:', error);
    throw error;
  }
}
