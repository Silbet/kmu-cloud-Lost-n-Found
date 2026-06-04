import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp = require('sharp');
import { getAwsRegion } from '../config/cloud.config';

const s3 = new S3Client({ region: getAwsRegion() });
const ORIGINAL_PREFIX = process.env.ORIGINAL_PREFIX || 'uploads/originals';
const THUMBNAIL_PREFIX = process.env.THUMBNAIL_PREFIX || 'images/thumbnails';
const DETAIL_PREFIX = process.env.DETAIL_PREFIX || 'images/details';
const THUMBNAIL_WIDTH = Number(process.env.THUMBNAIL_WIDTH || 480);
const DETAIL_WIDTH = Number(process.env.DETAIL_WIDTH || 1600);

export async function handler(event: { Records?: Array<{ s3?: { bucket?: { name?: string }; object?: { key?: string } } }> }) {
  const results = [];

  for (const record of event.Records ?? []) {
    const bucket = record.s3?.bucket?.name;
    const rawKey = record.s3?.object?.key;
    if (!bucket || !rawKey) continue;

    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    if (!key.startsWith(`${ORIGINAL_PREFIX}/`)) continue;

    const original = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await original.Body?.transformToByteArray();
    if (!bytes) continue;

    const source = Buffer.from(bytes);
    const [thumbnail, detail] = await Promise.all([
      sharp(source)
        .rotate()
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(source)
        .rotate()
        .resize({ width: DETAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
    ]);

    const relativeKey = key.slice(`${ORIGINAL_PREFIX}/`.length).replace(/\.[^.]+$/, '.webp');
    const thumbnailKey = `${THUMBNAIL_PREFIX}/${relativeKey}`;
    const detailKey = `${DETAIL_PREFIX}/${relativeKey}`;
    await Promise.all([
      s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/webp',
      })),
      s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: detailKey,
        Body: detail,
        ContentType: 'image/webp',
      })),
    ]);
    results.push({ source: key, thumbnail: thumbnailKey, detail: detailKey });
  }

  return { processed: results.length, results };
}
