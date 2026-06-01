# V2 AWS 리소스 계획

이 문서는 V2에서 사용할 AWS 리소스와 코드에서 참조하는 환경변수 기준을 정리한다. 이 저장소는 AWS 리소스를 직접 생성하지 않는다. 실제 리소스 생성은 AWS 콘솔 또는 별도 IaC 도구에서 수동으로 진행한다.

## 공통 규칙

- 리전: `us-east-1`
- 리소스 이름 형식: `pj-kmucloud-6-v2-{명칭}`
- DB 비밀번호, JWT secret, AWS credential 같은 민감 정보는 커밋하지 않는다.

## 예정 리소스

| 목적 | AWS 서비스 | 이름 예시 |
| --- | --- | --- |
| 프론트엔드 정적 파일 호스팅 | S3 | `pj-kmucloud-6-v2-frontend` |
| 프론트엔드 CDN | CloudFront | `pj-kmucloud-6-v2-frontend-cdn` |
| 이미지 객체 저장소 | S3 | `pj-kmucloud-6-v2-images` |
| API 진입점 | API Gateway | `pj-kmucloud-6-v2-api` |
| API 실행 환경 | Lambda | `pj-kmucloud-6-v2-api-handler` |
| 데이터베이스 | RDS PostgreSQL | `pj-kmucloud-6-v2-rds` |
| 매칭 작업 큐 | SQS | `pj-kmucloud-6-v2-matching-queue` |
| 매칭 워커 | Lambda | `pj-kmucloud-6-v2-matching-worker` |
| 썸네일 생성 워커 | Lambda | `pj-kmucloud-6-v2-thumbnail-worker` |
| 알림 토픽 | SNS | `pj-kmucloud-6-v2-notification-topic` |
| 자동 실행 작업 | EventBridge Scheduler + Lambda | `pj-kmucloud-6-v2-scheduled-jobs` |

## 환경변수 기준

백엔드는 `v2/backend/.env.example`을 기준으로 환경변수 이름을 관리한다. 로컬 개발에서는 기존처럼 Docker PostgreSQL을 계속 사용할 수 있고, 배포 환경에서는 `DATABASE_URL`을 RDS PostgreSQL 연결 문자열로 교체한다.

## Lambda 핸들러

백엔드 빌드 후 아래 핸들러 경로를 Lambda 설정에 사용한다.

| 목적 | Handler |
| --- | --- |
| API Gateway 진입점 | `dist/src/lambda/api.handler.handler` |
| SQS 매칭 워커 | `dist/src/lambda/matching-worker.handler.handler` |
| S3 썸네일 워커 | `dist/src/lambda/thumbnail-worker.handler.handler` |
| EventBridge 자동 실행 작업 | `dist/src/lambda/scheduled-jobs.handler.handler` |

API Lambda는 기존 NestJS 애플리케이션 전체를 API Gateway 뒤에서 실행한다. 워커 Lambda는 가능한 기존 도메인 서비스를 재사용해 비즈니스 규칙이 여러 곳으로 흩어지지 않도록 한다.

## 썸네일 생성 흐름

`pj-kmucloud-6-v2-images` 버킷의 객체 생성 이벤트를 썸네일 워커 Lambda에 연결한다. 워커는 원본 이미지를 읽고 WebP 썸네일을 아래 경로에 저장한다.

```text
thumbnails/{원본-key의-확장자를-webp로-변경한-값}
```

선택 환경변수:

```env
THUMBNAIL_PREFIX="thumbnails"
THUMBNAIL_WIDTH="480"
```

## 비동기 매칭 흐름

로컬 개발에서는 기본적으로 기존과 같은 동기 매칭을 사용한다.

```env
MATCHING_MODE="inline"
```

배포 환경에서는 SQS 기반 비동기 매칭을 켤 수 있다.

```env
MATCHING_MODE="queue"
SQS_MATCHING_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/{account-id}/pj-kmucloud-6-v2-matching-queue"
```

큐 모드가 켜져 있으면 신고 생성, 신고 수정, 습득물 보관 처리 시 사용자 요청 안에서 매칭 알고리즘을 직접 실행하지 않고 매칭 작업 메시지를 SQS에 넣는다. 별도 매칭 워커 Lambda가 큐를 소비해 같은 매칭 서비스 로직을 실행한다.

## SNS 알림 발행 흐름

인앱 알림은 기본 동작으로 유지한다.

```env
NOTIFICATION_PUBLISH_MODE="in-app"
```

SNS 토픽 생성 후 배포 환경에서는 알림 이벤트를 SNS로도 발행할 수 있다.

```env
NOTIFICATION_PUBLISH_MODE="sns"
SNS_NOTIFICATION_TOPIC_ARN="arn:aws:sns:us-east-1:{account-id}:pj-kmucloud-6-v2-notification-topic"
```

현재 단계에서는 구조화된 알림 이벤트만 SNS로 발행한다. 실제 이메일, SMS, 푸시 구독은 비용, 개인정보 수신 동의, 운영 정책을 확정한 뒤 추가한다.

## S3 이미지 업로드 흐름

V2 백엔드는 `POST /api/uploads/image/presigned-url` 엔드포인트를 제공한다.

요청 예시:

```json
{
  "filename": "wallet.jpg",
  "contentType": "image/jpeg",
  "purpose": "found-items"
}
```

응답 예시:

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

브라우저는 `uploadUrl`로 파일을 직접 `PUT` 업로드한다. 업로드가 끝난 뒤 애플리케이션은 `imageUrl` 또는 `objectKey`를 분실물/습득물 데이터와 함께 저장한다.

로컬 개발과 배포 프론트엔드 도메인을 위한 S3 CORS 예시는 다음과 같다.

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
