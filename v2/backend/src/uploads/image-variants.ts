const ORIGINAL_PREFIX = 'uploads/originals/';

export function createImageVariantUrls(originalKey?: string | null) {
  const baseUrl = process.env.S3_IMAGE_PUBLIC_BASE_URL?.replace(/\/$/, '');
  const relativeKey = getRelativeOriginalKey(originalKey);
  if (!baseUrl || !relativeKey) {
    return {};
  }

  const webpKey = relativeKey.replace(/\.[^.]+$/, '.webp');
  return {
    thumbnailUrl: `${baseUrl}/images/thumbnails/${webpKey}`,
    detailImageUrl: `${baseUrl}/images/details/${webpKey}`,
  };
}

function getRelativeOriginalKey(value?: string | null) {
  if (!value) return undefined;
  const originalKey = value.startsWith('s3://') ? value.split('/').slice(3).join('/') : value;
  if (!originalKey.startsWith(ORIGINAL_PREFIX)) return undefined;
  return originalKey.slice(ORIGINAL_PREFIX.length);
}
