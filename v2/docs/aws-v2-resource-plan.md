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
