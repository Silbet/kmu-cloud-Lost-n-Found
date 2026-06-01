import { apiClient, USE_MOCK } from './client';
import { mockStoreImage } from './mock/handlers';

export async function uploadImage(file: File): Promise<{ imageUrl: string }> {
  if (USE_MOCK) {
    const imageUrl = await mockStoreImage(file);
    return { imageUrl };
  }
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
}
