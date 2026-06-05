# V2 AWS 배포 진행 상황 및 요청사항

마지막 수정일: 2026-06-05

## 완료한 작업

- RDS PostgreSQL 생성 및 API Lambda 연결
- Prisma 마이그레이션 및 시드 적용
- API Gateway와 API Lambda 연결 및 Health Check 확인
- 로그인 및 JWT 발급 확인
- 이미지 S3 버킷 생성 및 CORS 설정
- Presigned URL 발급 및 S3 직접 업로드 확인
- 프론트엔드 빌드 및 S3 웹사이트 배포
- 매칭 SQS 메인 큐와 DLQ 생성 및 연결
- 썸네일 워커 Lambda 생성 및 배포
- 썸네일 워커 수동 S3 이벤트 테스트 성공
- 원본 한 장에서 목록용 480px 이미지와 상세용 1600px 이미지를 함께 생성하도록 워커 변경 및 배포
- Presigned S3 직접 업로드, 원본 객체 키 저장, 목록용·상세용 URL 분리를 위한 백엔드 및 프론트엔드 코드 수정과 빌드 확인
- 이미지 S3 버킷 `uploads/originals/` Prefix와 썸네일 워커 Lambda 트리거 연결
- S3 원본 업로드만으로 목록용·상세용 이미지가 자동 생성되는 것 확인
- SNS 알림 Topic 생성
- 매칭 워커 Lambda 생성, 코드 배포, 환경변수 설정
- 매칭 워커 Lambda의 RDS 접근 확인
- 매칭 SQS 큐를 매칭 워커 Lambda 트리거로 연결
- SQS 테스트 메시지가 매칭 워커 Lambda에서 처리되는 것 확인
- SNS Topic 속성 조회 및 Topic ARN 확인
- Scheduled Jobs Lambda 배포 ZIP 생성 및 S3 업로드
- Scheduled Jobs Lambda 생성 및 수동 실행 테스트 성공

## 썸네일 워커 실제 사진 테스트 결과

Galaxy S25로 촬영한 실제 사진을 사용해 테스트했다.

| 항목 | 원본 | 생성된 썸네일 |
| --- | ---: | ---: |
| 해상도 | 4000x3000 | 480x360 |
| 파일 형식 | JPEG | WebP |
| 파일 크기 | 3,229,872 bytes | 36,986 bytes |

- 파일 크기 약 98.85% 감소
- 원본보다 약 87.3배 작은 파일 생성
- 실제 이미지 처리 시간 약 759ms
- 콜드 스타트 포함 실행 시간 약 1.286초
- 최대 메모리 사용량 143MB
- 변환된 WebP에는 촬영 기기, 촬영 시간 등 원본 EXIF 메타데이터가 포함되지 않음
- 상세용 이미지는 1600x1200, 약 306 KB로 생성됨
- 상세용 이미지는 원본 대비 약 90.54% 감소, 원본보다 약 10.6배 작은 파일로 생성됨
- 목록용·상세용 이미지 동시 생성 시간 약 2.0초, 최대 메모리 사용량 172MB

사진의 장면 복잡도, 노이즈, 원본 압축률에 따라 결과 크기와 처리 시간은 달라질 수 있으므로 위 결과는 대표 측정 사례로 사용한다.

## 현재 안전 설정

- API Lambda `MATCHING_MODE`: `inline`
- API Lambda에 매칭 SQS Queue URL은 설정되어 있지만 현재 사용하지 않음
- API Lambda `NOTIFICATION_PUBLISH_MODE`: `in-app`

## 남은 작업

- CloudFront 생성 후 API Lambda에 `S3_IMAGE_PUBLIC_BASE_URL` 설정
- CloudFront 도메인을 기준으로 백엔드와 프론트엔드 새 버전 배포
- API Lambda의 SQS 접근 경로 해결 후 `MATCHING_MODE=queue` 전환
- API Lambda의 SNS 접근 경로 해결 후 `NOTIFICATION_PUBLISH_MODE=sns` 전환
- SNS 실제 발행 테스트
- 서비스 정책 확정 후 EventBridge Scheduler 연결

## 운영자 검토 및 요청사항

### 1. VPC 내부 API Lambda의 SQS 접근 문제

이전에 프라이빗 RDS 연결을 위해 API Lambda를 RDS와 같은 VPC에 연결해주셨다.

- API Lambda: `pj-kmucloud-6-api-handler-v2`
- VPC: `vpc-026e429eb34e47fb8`
- Lambda 보안그룹: `sg-0bb36ba6fc5e18c67`
- SQS: `pj-kmucloud-6-matching-queue-v2`

EC2에서는 API Lambda와 동일한 `SafeRole-pj-kmucloud-6` 역할로 SQS 메시지 전송, 조회, 삭제가 가능하다. 하지만 VPC에 연결된 API Lambda에서 SQS에 메시지를 전송하면 오류 메시지 없이 30초 후 timeout이 발생한다.

프라이빗 RDS 접근을 유지하면서 API Lambda가 SQS에도 접근할 수 있도록 필요한 네트워크 구성을 검토 부탁드린다.

### 2. VPC 내부 API Lambda의 SNS 접근 가능성

SNS Topic은 생성했고 속성 조회까지 확인했다.

- SNS Topic: `arn:aws:sns:us-east-1:730335373015:pj-kmucloud-6-notification-topic-v2`

다만 API Lambda는 프라이빗 RDS 접근을 위해 VPC 내부에 들어가 있다. 앞서 SQS 전송이 Lambda 내부에서 timeout 되었던 것처럼, SNS 발행도 같은 네트워크 문제가 발생할 수 있다. 현재 API Lambda는 안전하게 `NOTIFICATION_PUBLISH_MODE=in-app`으로 유지한다.

프라이빗 RDS 접근을 유지하면서 API Lambda가 SNS에도 접근할 수 있도록 필요한 네트워크 구성을 함께 검토 부탁드린다.

### 3. CloudFront 구성 요청

CloudFront 배포 하나에 두 개의 S3 Origin을 연결하는 구성을 요청한다.

#### 기본 Origin

- S3 버킷: `pj-kmucloud-6-frontend-v2`
- 경로 동작: 기본 경로 `/*`
- 목적: React 프론트엔드 HTML, JavaScript, CSS 제공
- SPA 라우팅을 위해 403/404 응답을 `/index.html`, HTTP 200으로 처리

#### 이미지 Origin

- S3 버킷: `pj-kmucloud-6-images-v2`
- 경로 동작: `/images/*`
- `/images/thumbnails/*`: 목록용 이미지
- `/images/details/*`: 상세 화면용 이미지

가능하다면 두 S3 버킷은 공개 접근을 차단하고 CloudFront OAC를 통해서만 읽을 수 있도록 구성한다. 이미지 버킷에서는 생성된 `/images/*` 객체만 CloudFront에서 읽을 수 있도록 하고, 원본 `/uploads/originals/*` 객체는 외부에 제공하지 않는다.

### 4. EventBridge Scheduler 연결 보류

Scheduled Jobs Lambda는 생성했고 수동 실행 테스트까지 성공했다.

- Lambda 이름: `pj-kmucloud-6-scheduled-jobs-v2`
- Runtime: `Node.js 22.x`
- Handler: `index.handler`
- 수동 테스트 응답: `scheduled-jobs-ready`

현재 핸들러는 자동 취소, 자동 폐기 등 정책이 확정되기 전의 준비용 골격이다. EventBridge Scheduler 연결은 서비스 정책 확정 후 진행한다.

## 생성된 리소스

- SNS Topic: `arn:aws:sns:us-east-1:730335373015:pj-kmucloud-6-notification-topic-v2`
- Matching Worker Lambda: `pj-kmucloud-6-matching-worker-v2`
- Matching SQS Queue: `https://sqs.us-east-1.amazonaws.com/730335373015/pj-kmucloud-6-matching-queue-v2`
- Scheduled Jobs Lambda: `pj-kmucloud-6-scheduled-jobs-v2`
- Scheduled Jobs ZIP: `s3://pj-kmucloud-6-images-v2/deploy/pj-kmucloud-6-scheduled-jobs-v2.zip`
