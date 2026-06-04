import { apiClient, USE_MOCK } from './client';
import { mockStoreImage } from './mock/handlers';

export async function uploadImage(file: File): Promise<{ imageUrl: string }> {
  if (USE_MOCK) {
    const imageUrl = await mockStoreImage(file);
    return { imageUrl };
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
  }

  const { data } = await apiClient.post<{
    uploadUrl: string;
    objectKey: string;
    headers: Record<string, string>;
  }>('/uploads/image/presigned-url', {
    filename: file.name,
    contentType: file.type,
    purpose: 'found-items',
  });

  const response = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: data.headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error('S3 이미지 업로드에 실패했습니다.');
  }

  return { imageUrl: data.objectKey };
}
