# V2 AWS Resource Plan

V2 uses AWS managed services, but this repository does not create AWS resources directly. Resources should be created manually in the AWS console or through a separate IaC workflow.

## Common Rules

- Region: `us-east-1`
- Naming format: `pj-kmucloud-6-v2-{name}`
- Secrets such as database passwords, JWT secrets, and AWS credentials must not be committed.

## Planned Resources

| Purpose | AWS service | Name example |
| --- | --- | --- |
| Frontend static hosting | S3 | `pj-kmucloud-6-v2-frontend` |
| Frontend CDN | CloudFront | `pj-kmucloud-6-v2-frontend-cdn` |
| Image object storage | S3 | `pj-kmucloud-6-v2-images` |
| API entrypoint | API Gateway | `pj-kmucloud-6-v2-api` |
| API runtime | Lambda | `pj-kmucloud-6-v2-api-handler` |
| Database | RDS PostgreSQL | `pj-kmucloud-6-v2-rds` |
| Matching queue | SQS | `pj-kmucloud-6-v2-matching-queue` |
| Matching worker | Lambda | `pj-kmucloud-6-v2-matching-worker` |
| Thumbnail worker | Lambda | `pj-kmucloud-6-v2-thumbnail-worker` |
| Notification topic | SNS | `pj-kmucloud-6-v2-notification-topic` |
| Scheduled jobs | EventBridge Scheduler + Lambda | `pj-kmucloud-6-v2-scheduled-jobs` |

## Environment Variables

The backend uses `.env.example` as the source of required configuration names. Local development can keep using Docker PostgreSQL. Deployed environments should replace `DATABASE_URL` with the RDS PostgreSQL connection string and set AWS resource identifiers after the resources are created.

## Async Matching Flow

Local development uses inline matching by default:

```env
MATCHING_MODE="inline"
```

Deployed V2 can enable SQS-based matching:

```env
MATCHING_MODE="queue"
SQS_MATCHING_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/{account-id}/pj-kmucloud-6-v2-matching-queue"
```

When queue mode is enabled, report and stored-item changes enqueue a matching job instead of running the matching algorithm inside the user request. A separate matching worker Lambda consumes the queue and calls the same matching service logic.

## S3 Image Upload Flow

The V2 backend exposes `POST /api/uploads/image/presigned-url`.

Request body:

```json
{
  "filename": "wallet.jpg",
  "contentType": "image/jpeg",
  "purpose": "found-items"
}
```

Response:

```json
{
  "uploadUrl": "https://...",
  "objectKey": "uploads/found-items/2026-06-02/uuid.jpg",
  "imageUrl": "s3://pj-kmucloud-6-v2-images/uploads/found-items/2026-06-02/uuid.jpg",
  "method": "PUT",
  "expiresIn": 300,
  "headers": {
    "Content-Type": "image/jpeg"
  }
}
```

The browser uploads the file directly to S3 with `PUT uploadUrl`. After upload, the app stores `imageUrl` or `objectKey` with the item/report data.

Recommended S3 CORS rule for local development and deployed frontend domains:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:5273"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
