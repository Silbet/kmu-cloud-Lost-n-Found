# V2 AWS Manual Setup Guide

This guide lists the AWS resources that must be created manually for V2. The repository only contains application code, Lambda handlers, environment variable examples, and setup documentation.

## 1. Region And Naming

- Region: `us-east-1`
- Naming pattern: `pj-kmucloud-6-v2-{name}`

Use the same prefix for every manually created resource so the architecture is easy to explain and inspect.

## 2. RDS PostgreSQL

Create an RDS PostgreSQL database:

- Name: `pj-kmucloud-6-v2-rds`
- Engine: PostgreSQL
- Database name: `lost_found`
- Public access: disabled unless temporary setup requires otherwise
- Backup: enabled

Backend environment:

```env
DATABASE_URL="postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/lost_found?schema=public"
```

After the database is reachable from the backend or Lambda network:

```powershell
cd v2/backend
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

## 3. Image S3 Bucket

Create an S3 bucket:

- Name: `pj-kmucloud-6-v2-images`
- Purpose: original upload images and generated thumbnails

Backend environment:

```env
AWS_REGION="us-east-1"
S3_IMAGE_BUCKET="pj-kmucloud-6-v2-images"
PRESIGNED_UPLOAD_EXPIRES_SECONDS="300"
```

If images are served through CloudFront later:

```env
S3_IMAGE_PUBLIC_BASE_URL="https://IMAGE_CLOUDFRONT_DOMAIN"
```

Add CORS for browser direct uploads. Include the deployed frontend origin after CloudFront is ready.

## 4. Frontend S3 And CloudFront

Create an S3 bucket:

- Name: `pj-kmucloud-6-v2-frontend`
- Purpose: React build output

Create a CloudFront distribution:

- Name: `pj-kmucloud-6-v2-frontend-cdn`
- Origin: frontend S3 bucket
- SPA fallback: route 403/404 to `/index.html`

Build and upload frontend artifacts after setting the API base URL:

```powershell
cd v2/web
npm.cmd install
npm.cmd run build
```

Upload the generated build output to `pj-kmucloud-6-v2-frontend`.

## 5. API Gateway And API Lambda

Build backend:

```powershell
cd v2/backend
npm.cmd install
npm.cmd run build
```

Create a Lambda:

- Name: `pj-kmucloud-6-v2-api-handler`
- Handler: `dist/src/lambda/api.handler.handler`
- Runtime: Node.js 22 or compatible Node.js runtime

Create an API Gateway:

- Name: `pj-kmucloud-6-v2-api`
- Integration: API Lambda
- Route all API requests to the Lambda handler

Required environment variables:

```env
AWS_REGION="us-east-1"
DATABASE_URL="postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/lost_found?schema=public"
JWT_SECRET="replace-with-a-long-random-jwt-secret"
S3_IMAGE_BUCKET="pj-kmucloud-6-v2-images"
```

Optional, when each feature is enabled:

```env
MATCHING_MODE="queue"
SQS_MATCHING_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/{account-id}/pj-kmucloud-6-v2-matching-queue"
NOTIFICATION_PUBLISH_MODE="sns"
SNS_NOTIFICATION_TOPIC_ARN="arn:aws:sns:us-east-1:{account-id}:pj-kmucloud-6-v2-notification-topic"
```

## 6. SQS Matching Worker

Create an SQS queue:

- Name: `pj-kmucloud-6-v2-matching-queue`

Create a Lambda:

- Name: `pj-kmucloud-6-v2-matching-worker`
- Handler: `dist/src/lambda/matching-worker.handler.handler`
- Trigger: SQS queue

This worker consumes matching jobs and calls the existing matching service logic.

## 7. Thumbnail Worker

Create a Lambda:

- Name: `pj-kmucloud-6-v2-thumbnail-worker`
- Handler: `dist/src/lambda/thumbnail-worker.handler.handler`
- Trigger: S3 object-created event from `pj-kmucloud-6-v2-images`

Environment variables:

```env
AWS_REGION="us-east-1"
THUMBNAIL_PREFIX="thumbnails"
THUMBNAIL_WIDTH="480"
```

The worker writes generated thumbnails to:

```text
thumbnails/{original-key}.webp
```

## 8. SNS Notification Topic

Create an SNS topic:

- Name: `pj-kmucloud-6-v2-notification-topic`

Backend environment:

```env
NOTIFICATION_PUBLISH_MODE="sns"
SNS_NOTIFICATION_TOPIC_ARN="arn:aws:sns:us-east-1:{account-id}:pj-kmucloud-6-v2-notification-topic"
```

Actual email, SMS, or push subscriptions should be added only after notification consent and cost policy are confirmed.

## 9. Scheduled Jobs

Create a Lambda:

- Name: `pj-kmucloud-6-v2-scheduled-jobs`
- Handler: `dist/src/lambda/scheduled-jobs.handler.handler`

Create EventBridge Scheduler rules after automatic cancellation or disposal policies are finalized. This handler is currently a ready-to-wire placeholder.

## 10. IAM Checklist

Give each Lambda only the permissions it needs:

- API Lambda: RDS network access, S3 presigned upload permissions, optional SQS send, optional SNS publish
- Matching worker: SQS consume, RDS access
- Thumbnail worker: S3 get original object, S3 put thumbnail object
- Scheduled jobs: RDS access and any service permissions required by future policies

Avoid committing credentials. Use Lambda environment variables and AWS-managed secrets where possible.
