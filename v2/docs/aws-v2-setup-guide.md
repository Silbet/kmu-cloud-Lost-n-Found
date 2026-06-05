# V2 AWS 수동 구성 가이드

이 문서는 V2 실행에 필요한 AWS 리소스를 콘솔에서 직접 생성할 때 따라갈 수 있는 가이드다. 저장소에는 애플리케이션 코드, Lambda 핸들러, 환경변수 예시, 설정 문서만 포함한다.

## 1. 리전과 이름 규칙

- 리전: `us-east-1`
- 이름 규칙: `pj-kmucloud-6-{명칭}-v2`

모든 리소스에 같은 접두어를 사용하면 발표와 점검 시 어떤 리소스가 V2에 속하는지 쉽게 설명할 수 있다.

## 2. RDS PostgreSQL

RDS PostgreSQL 데이터베이스를 생성한다.

- 이름: `pj-kmucloud-6-rds-v2`
- 엔진: PostgreSQL
- 데이터베이스 이름: `lost_found`
- 퍼블릭 액세스: 기본적으로 비활성화
- 백업: 활성화

백엔드 환경변수:

```env
DATABASE_URL="postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/lost_found?schema=public"
```

백엔드 또는 Lambda 네트워크에서 RDS에 접근할 수 있게 된 뒤 마이그레이션과 시드를 적용한다.

```powershell
cd v2/backend
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

## 3. 이미지 S3 버킷

이미지 저장용 S3 버킷을 생성한다.

- 이름: `pj-kmucloud-6-images-v2`
- 목적: 원본 업로드 이미지와 생성된 목록용·상세용 이미지 저장

백엔드 환경변수:

```env
AWS_REGION="us-east-1"
S3_IMAGE_BUCKET="pj-kmucloud-6-images-v2"
PRESIGNED_UPLOAD_EXPIRES_SECONDS="300"
```

Lambda 콘솔에서는 `AWS_REGION`이 예약 환경변수로 자동 제공되므로 직접 추가하지 않는다.

이미지를 CloudFront로 제공하게 되면 아래 값을 추가한다.

```env
S3_IMAGE_PUBLIC_BASE_URL="https://IMAGE_CLOUDFRONT_DOMAIN"
```

브라우저 직접 업로드를 위해 S3 CORS를 설정한다. CloudFront 배포 후에는 실제 프론트엔드 도메인도 허용 origin에 추가한다.

## 4. 프론트엔드 S3와 CloudFront

프론트엔드 정적 파일용 S3 버킷을 생성한다.

- 이름: `pj-kmucloud-6-frontend-v2`
- 목적: React 빌드 결과물 저장

CloudFront 배포를 생성한다.

- 이름: `pj-kmucloud-6-frontend-cdn-v2`
- 기본 Origin: 프론트엔드 S3 버킷
- 이미지 Origin: 이미지 S3 버킷의 `/images/*`
- SPA fallback: 403/404 응답을 `/index.html`로 연결

API 기본 URL을 설정한 뒤 프론트엔드를 빌드한다.

```powershell
cd v2/web
npm.cmd install
npm.cmd run build
```

생성된 빌드 결과물을 `pj-kmucloud-6-frontend-v2` 버킷에 업로드한다.

## 5. API Gateway와 API Lambda

백엔드를 빌드한다.

```powershell
cd v2/backend
npm.cmd install
npm.cmd run build
```

Lambda를 생성한다.

- 이름: `pj-kmucloud-6-api-handler-v2`
- Handler: `index.handler`
- Runtime: Node.js 22 또는 호환 가능한 Node.js 런타임

API Gateway를 생성한다.

- 이름: `pj-kmucloud-6-api-v2`
- Integration: API Lambda
- 라우팅: 모든 API 요청을 API Lambda로 전달

필수 환경변수:

```env
DATABASE_URL="postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/lost_found?schema=public"
JWT_SECRET="replace-with-a-long-random-jwt-secret"
S3_IMAGE_BUCKET="pj-kmucloud-6-images-v2"
PRESIGNED_UPLOAD_EXPIRES_SECONDS="300"
MATCHING_MODE="inline"
NOTIFICATION_PUBLISH_MODE="in-app"
```

기능을 켤 때 추가하는 선택 환경변수:

```env
MATCHING_MODE="queue"
SQS_MATCHING_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/{account-id}/pj-kmucloud-6-matching-queue-v2"
NOTIFICATION_PUBLISH_MODE="sns"
SNS_NOTIFICATION_TOPIC_ARN="arn:aws:sns:us-east-1:{account-id}:pj-kmucloud-6-notification-topic-v2"
```

## 6. SQS 매칭 워커

먼저 실패 메시지를 보관할 DLQ를 생성한다.

- 이름: `pj-kmucloud-6-matching-dlq-v2`
- 목적: 매칭 작업 처리 실패가 반복된 메시지 보관
- 메시지 보존 기간: 7일 또는 14일

그 다음 메인 SQS 큐를 생성한다.

- 이름: `pj-kmucloud-6-matching-queue-v2`
- DLQ 설정: `pj-kmucloud-6-matching-dlq-v2` 연결
- maxReceiveCount: 5

이 설정을 적용하면 매칭 워커가 같은 메시지 처리를 여러 번 실패했을 때 메시지가 메인 큐에 계속 남아 반복 실행되지 않고 DLQ로 이동한다. 운영자는 DLQ에서 실패한 신고 ID와 메시지 내용을 확인해 원인을 추적할 수 있다.

Lambda를 생성한다.

- 이름: `pj-kmucloud-6-matching-worker-v2`
- Handler: `index.handler`
- Trigger: SQS queue

이 워커는 매칭 작업 메시지를 소비하고 기존 매칭 서비스 로직을 호출한다.

## 7. 이미지 후처리 워커

Lambda를 생성한다.

- 이름: `pj-kmucloud-6-thumbnail-worker-v2`
- Handler: `index.handler`
- Trigger: `pj-kmucloud-6-images-v2` 버킷의 S3 object-created 이벤트
- Trigger Prefix: `uploads/originals/`

환경변수:

```env
ORIGINAL_PREFIX="uploads/originals"
THUMBNAIL_PREFIX="images/thumbnails"
DETAIL_PREFIX="images/details"
THUMBNAIL_WIDTH="480"
DETAIL_WIDTH="1600"
```

워커는 원본 이미지를 읽고 목록용 이미지와 상세용 이미지를 아래 경로에 저장한다.

```text
uploads/originals/{purpose}/{date}/{uuid}.{ext}
  -> images/thumbnails/{purpose}/{date}/{uuid}.webp
  -> images/details/{purpose}/{date}/{uuid}.webp
```

## 8. SNS 알림 토픽

SNS 토픽을 생성한다.

- 이름: `pj-kmucloud-6-notification-topic-v2`

백엔드 환경변수:

```env
NOTIFICATION_PUBLISH_MODE="sns"
SNS_NOTIFICATION_TOPIC_ARN="arn:aws:sns:us-east-1:{account-id}:pj-kmucloud-6-notification-topic-v2"
```

실제 이메일, SMS, 푸시 구독은 알림 수신 동의와 비용 정책을 확정한 뒤 추가한다.

## 9. 자동 실행 작업

Lambda를 생성한다.

- 이름: `pj-kmucloud-6-scheduled-jobs-v2`
- Handler: `index.handler`

EventBridge Scheduler를 생성한다.

- 이름: `pj-kmucloud-6-scheduled-jobs-v2`
- Target: Lambda `pj-kmucloud-6-scheduled-jobs-v2`
- Payload:

```json
{
  "source": "eventbridge-scheduler",
  "job": "daily-maintenance"
}
```

현재 핸들러는 자동 취소, 자동 폐기 같은 정책이 확정되기 전의 준비용 골격이다. 지금은 자동 실행 인프라 연결과 Lambda 호출 가능 여부를 검증하고, 실제 장기 미수령 처리나 폐기 검토 알림 로직은 서비스 정책 확정 후 구현한다.

## 10. IAM 체크리스트

각 Lambda에는 필요한 권한만 부여한다.

- API Lambda: RDS 네트워크 접근, S3 Presigned Upload 권한, 선택적으로 SQS send, SNS publish
- 매칭 워커: SQS consume, RDS 접근, DLQ로 이동된 메시지 확인을 위한 SQS 조회 권한
- 이미지 후처리 워커: S3 원본 객체 읽기, S3 목록용·상세용 이미지 객체 쓰기
- 자동 실행 작업: RDS 접근과 향후 정책에 필요한 서비스 권한

Credential은 커밋하지 않는다. 가능한 Lambda 환경변수와 AWS 관리형 secret을 사용한다.
