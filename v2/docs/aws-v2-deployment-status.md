# V2 AWS 배포 진행 상황 및 요청사항

마지막 수정일: 2026-06-06

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
- CloudFront 배포 `pj-kmucloud-6-cf`를 프론트엔드 S3와 이미지 S3에 연결
- CloudFront 기본 도메인 `https://d3jxhrfl6v2ils.cloudfront.net` 프론트 접속 확인
- React SPA 라우팅을 위한 403/404 -> `/index.html` fallback 확인
- `/images/*` 경로를 이미지 S3 Origin으로 연결하고 목록용·상세용 이미지 조회 확인
- 실제 스마트폰 사진으로 presigned URL 발급, S3 직접 업로드, 썸네일/상세 이미지 생성, CloudFront 이미지 URL 반환 확인
- EventBridge Scheduler 생성
- 교육용 계정 네트워크 제한으로 RDS를 public access로 전환하고 API Lambda, Matching Worker Lambda의 VPC 연결 제거
- API Lambda `MATCHING_MODE=queue`, `NOTIFICATION_PUBLISH_MODE=sns` 전환
- API Lambda -> SQS -> Matching Worker Lambda -> RDS 처리 흐름 확인
- SNS Topic publish 흐름 확인. 실제 구독자는 아직 없음
- CloudFront 프론트 도메인에서 presigned S3 업로드가 가능하도록 이미지 S3 CORS에 CloudFront Origin 추가

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

## 현재 설정

- API Lambda `MATCHING_MODE`: `queue`
- API Lambda `SQS_MATCHING_QUEUE_URL`: `https://sqs.us-east-1.amazonaws.com/730335373015/pj-kmucloud-6-matching-queue-v2`
- API Lambda `NOTIFICATION_PUBLISH_MODE`: `sns`
- API Lambda `SNS_NOTIFICATION_TOPIC_ARN`: `arn:aws:sns:us-east-1:730335373015:pj-kmucloud-6-notification-topic-v2`
- API Lambda VPC 연결: 없음
- Matching Worker Lambda VPC 연결: 없음
- RDS `PubliclyAccessible`: `true`

## 남은 작업

- EventBridge Scheduler의 자동 호출 로그 확인
- 자동 취소, 폐기 검토 알림 등 실제 scheduled job 정책 확정 후 핸들러 구현
- SNS 실제 구독자 연결과 외부 발송 정책 확정
- 백엔드 역할 기반 권한 Guard 구현
- 발표 종료 후 RDS public access와 5432 `0.0.0.0/0` 인바운드 규칙 제거 또는 축소

## 운영자 검토 및 처리 결과

### 1. VPC 내부 API Lambda의 SQS/SNS 접근 문제

이전에 프라이빗 RDS 연결을 위해 API Lambda와 Matching Worker Lambda를 RDS와 같은 VPC에 연결했다.

- API Lambda: `pj-kmucloud-6-api-handler-v2`
- Matching Worker Lambda: `pj-kmucloud-6-matching-worker-v2`
- SQS: `pj-kmucloud-6-matching-queue-v2`
- SNS Topic: `arn:aws:sns:us-east-1:730335373015:pj-kmucloud-6-notification-topic-v2`

VPC 내부 Lambda가 SQS/SNS public service endpoint에 접근하려면 NAT Gateway 또는 VPC Endpoint가 필요했다. 교육용 계정에서는 해당 네트워크 구성이 제한되어 있어, 실습 환경에서는 RDS public access와 Lambda VPC 미연결 구조로 단순화했다.

현재 API Lambda와 Matching Worker Lambda는 VPC 연결을 제거했고, RDS는 public endpoint로 접근한다. API Lambda -> SQS -> Matching Worker Lambda 처리와 SNS Topic publish 흐름을 확인했다.

이 구성은 교육용 실습 목적의 타협안이다. 운영 환경에서는 RDS private subnet, Lambda VPC 연결, SQS/SNS VPC Endpoint 또는 NAT Gateway 구성이 더 적절하다.

### 2. RDS public access 보안 주의

현재 RDS는 public access가 켜져 있고 PostgreSQL 5432 포트가 `0.0.0.0/0`에 열려 있다.

- RDS: `pj-kmucloud-6-rds-v2`
- Endpoint: `pj-kmucloud-6-rds-v2.cj24wem202yj.us-east-1.rds.amazonaws.com`
- Security Group: `sg-0ca0a81e2878d7541`

발표 종료 후에는 public access를 끄거나, 최소한 5432 인바운드 CIDR을 필요한 소스만 허용하도록 축소해야 한다. DB 비밀번호도 강한 값으로 교체하는 것을 권장한다.

### 3. CloudFront 구성 완료

CloudFront 배포 하나에 두 개의 S3 Origin을 연결했다.

- CloudFront 배포: `pj-kmucloud-6-cf`
- 배포 ID: `E1NAPAY4GOTDVW`
- 도메인: `https://d3jxhrfl6v2ils.cloudfront.net`

#### 기본 Origin

- S3 버킷: `pj-kmucloud-6-frontend-v2`
- 경로 동작: 기본 경로 `/*`
- 목적: React 프론트엔드 HTML, JavaScript, CSS 제공
- SPA 라우팅을 위해 403/404 응답을 `/index.html`, HTTP 200으로 처리
- 검증: `/`, `/search`, `/items/new` HTTP 200 확인

#### 이미지 Origin

- S3 버킷: `pj-kmucloud-6-images-v2`
- 경로 동작: `/images/*`
- `/images/thumbnails/*`: 목록용 이미지
- `/images/details/*`: 상세 화면용 이미지
- 검증: 실제 생성된 WebP 썸네일과 상세 이미지가 CloudFront에서 HTTP 200으로 조회됨
- 이미지 업로드 CORS: CloudFront Origin `https://d3jxhrfl6v2ils.cloudfront.net`에서 S3 presigned PUT preflight HTTP 200 확인

이미지 버킷은 CloudFront 배포 `E1NAPAY4GOTDVW`가 `/images/*` 객체를 읽을 수 있도록 정책을 적용했다. 원본 `/uploads/originals/*` 객체는 사용자에게 직접 제공하지 않고, 목록용·상세용 변환 이미지만 CloudFront URL로 내려준다.

### 4. EventBridge Scheduler 연결

Scheduled Jobs Lambda는 생성했고 수동 실행 테스트까지 성공했다. EventBridge Scheduler도 발표 기간 동안 실행되도록 생성했다.

- Lambda 이름: `pj-kmucloud-6-scheduled-jobs-v2`
- Runtime: `Node.js 22.x`
- Handler: `index.handler`
- 수동 테스트 응답: `scheduled-jobs-ready`
- Scheduler 이름: `pj-kmucloud-6-scheduled-jobs-v2`
- 기간: 2026-06-05 00:00부터 2026-06-10 00:00까지

현재 핸들러는 자동 취소, 자동 폐기 등 정책이 확정되기 전의 준비용 골격이다. 실제 장기 미수령 처리, 폐기 검토 알림, 자동 취소 정책은 아직 코드로 구현하지 않았다. EC2 역할에는 `scheduler:GetSchedule` 권한이 없어 CLI에서 스케줄 설정 조회는 불가능했으며, Lambda 수동 호출과 로그 스트림 생성은 확인했다.

## 서비스 구현 점검 메모

- 프론트엔드는 역할별 화면 접근을 제한하지만, 백엔드 API에는 아직 역할 기반 Guard가 없다. 현재는 JWT 인증만 통과하면 일반 사용자도 일부 관리자 API를 직접 호출할 수 있다.
- `GET /api/admin/stats`를 일반 사용자 토큰으로 호출했을 때 HTTP 200이 반환되는 것을 확인했다. 운영 환경에서는 `ADMIN`, `MANAGER`, `USER` 역할별 Guard를 백엔드에 추가해야 한다.
- `scheduled-jobs` Lambda는 현재 연결 검증용 골격이며 실제 자동 폐기, 자동 취소, 폐기 검토 알림 생성 로직은 없다.
- SNS Topic은 연결되어 있고 publish 흐름은 확인했지만 실제 구독자가 없어 외부 알림 발송은 아직 수행하지 않는다.

## 생성된 리소스

- SNS Topic: `arn:aws:sns:us-east-1:730335373015:pj-kmucloud-6-notification-topic-v2`
- Matching Worker Lambda: `pj-kmucloud-6-matching-worker-v2`
- Matching SQS Queue: `https://sqs.us-east-1.amazonaws.com/730335373015/pj-kmucloud-6-matching-queue-v2`
- Scheduled Jobs Lambda: `pj-kmucloud-6-scheduled-jobs-v2`
- Scheduled Jobs ZIP: `s3://pj-kmucloud-6-images-v2/deploy/pj-kmucloud-6-scheduled-jobs-v2.zip`
- Frontend/Image CloudFront: `https://d3jxhrfl6v2ils.cloudfront.net`
