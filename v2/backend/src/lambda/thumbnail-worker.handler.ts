import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { getAwsRegion } from '../config/cloud.config';

const s3 = new S3Client({ region: getAwsRegion() });
const THUMBNAIL_PREFIX = process.env.THUMBNAIL_PREFIX || 'thumbnails';
const THUMBNAIL_WIDTH = Number(process.env.THUMBNAIL_WIDTH || 480);

export async function handler(event: { Records?: Array<{ s3?: { bucket?: { name?: string }; object?: { key?: string } } }> }) {
  const results = [];

  for (const record of event.Records ?? []) {
    const bucket = record.s3?.bucket?.name;
    const rawKey = record.s3?.object?.key;
    if (!bucket || !rawKey) continue;

    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    if (key.startsWith(`${THUMBNAIL_PREFIX}/`)) continue;

    const original = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await original.Body?.transformToByteArray();
    if (!bytes) continue;

    const thumbnail = await sharp(Buffer.from(bytes))
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbnailKey = `${THUMBNAIL_PREFIX}/${key.replace(/\.[^.]+$/, '.webp')}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/webp',
      }),
    );
    results.push({ source: key, thumbnail: thumbnailKey });
  }

  return { processed: results.length, results };
}
