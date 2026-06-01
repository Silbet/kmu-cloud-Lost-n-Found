# Backend Design Notes

백엔드 구현 전에 확정한 인프라, 정책, 테이블 설계, API 명세 초안을 정리한다.
기준은 현재 프론트엔드 Mock 코드의 의도를 우선하고, 충돌 지점은 회의 결정사항을 따른다.

## 1. 인프라 방향

인프라를 최소화하기 위해 단일 EC2에 프론트엔드, 백엔드, DB를 함께 배포한다.

- Frontend: React + Vite 정적 빌드
- Backend: NestJS + TypeScript
- Database: PostgreSQL Docker 컨테이너
- ORM: Prisma
- Runtime: Docker Compose
- Server: 단일 EC2
- API Gateway: 사용하지 않음
- RDS: 사용하지 않음

배포 형태:

```text
EC2
├─ nginx 또는 정적 파일 서버
│  └─ React 정적 빌드
├─ backend container
│  └─ NestJS API
└─ postgres container
   └─ PostgreSQL
```

주의:

- DB는 RDS가 아니라 EC2 내부 PostgreSQL 컨테이너를 사용한다.
- PostgreSQL 데이터는 Docker volume에 저장한다.
- 과제용 최소 인프라 구조이므로 백업/복구는 직접 관리한다.
- 이미지 업로드는 기본적으로 EC2 로컬 파일 저장으로 구현하고, 필요하면 S3로 확장한다.

## 2. 역할 정책

계정 하나는 역할 하나만 가진다.

- 일반사용자: 분실물 신고, 습득물 등록, 매칭 후보 확인 요청, 수령 대기 취소
- 보관소관리자: 보관 위치 입력/변경, 확인 요청 승인/반려, 수령완료 처리, 수령 대기 취소, 폐기예정 전환
- 운영관리자: 전체 목록 조회, 통계 조회, 장기 미수령 조회, 보관소관리자 승인, 운영 설정 관리

DB에서는 `user_roles` 테이블을 두지 않고 `users.role` 단일 컬럼으로 관리한다.

## 3. 상태 흐름

### 3.1 분실 신고 상태

- 접수
- 매칭후보있음
- 찾기완료
- 종료

상태 전환:

- `접수 -> 매칭후보있음`: 매칭 후보 생성 시
- `매칭후보있음 -> 찾기완료`: 보관소관리자가 확인 요청 승인 시
- `찾기완료 -> 매칭후보있음`: 수령 대기 취소 시
- `찾기완료 -> 종료`: 수령완료 처리 시

### 3.2 습득물 상태

- 등록
- 보관중
- 수령대기
- 수령완료
- 폐기예정

상태 전환:

- `등록 -> 보관중`: 보관소관리자가 보관 위치 입력 시
- `보관중 -> 수령대기`: 확인 요청 승인 시
- `수령대기 -> 보관중`: 수령 대기 취소 또는 자동 취소 시
- `수령대기 -> 수령완료`: 보관소관리자가 본인 확인 후 수령완료 처리 시
- `보관중 -> 폐기예정`: 장기 미수령 알림 후 보관소관리자가 수동 전환

### 3.3 매칭 상태

- 활성
- 확인요청중
- 승인
- 반려
- 비활성

상태 전환:

- `활성 -> 확인요청중`: 분실자가 확인 요청 시
- `확인요청중 -> 승인`: 보관소관리자가 승인 시
- `확인요청중 -> 반려`: 보관소관리자가 반려 시
- `승인 -> 활성`: 수령 대기 취소 시
- `승인 -> 비활성`: 수령완료 처리 시

## 4. 확정 정책

- 분실 신고 삭제는 찾기완료 전까지 가능하다.
- 분실 신고 삭제 시 연결된 매칭 후보는 cascade 삭제하고, 습득물은 보관중 상태를 유지한다.
- 분실 신고 수정은 접수/매칭후보있음 상태에서 가능하며, 수정 시 매칭 후보를 재계산한다.
- 한 사람은 여러 건의 분실 신고를 할 수 있다.
- 습득물 삭제는 등록 상태에서만 가능하다.
- 습득물은 보관중 상태부터 검색/매칭 후보에 표시한다.
- 습득물 등록 직후가 아니라, 보관 위치 입력으로 보관중 전환될 때 매칭을 실행한다.
- 매칭 기준은 물품명 + 카테고리 + 장소 + 날짜 근접이다.
- 물품명은 공백과 대소문자를 무시한 포함 관계로 판단한다.
- 날짜 근접 기본값은 운영 설정의 `matchDateRangeDays`를 사용한다.
- 하나의 분실 신고에는 동시에 확인 요청 1건만 가능하다.
- 반려 후에도 재요청 가능하다.
- 수령 대기 취소 후에도 재요청 가능하다.
- 수령완료 습득물은 일반 검색 결과에서 제외한다.
- 관리자 화면에서는 수령완료 습득물도 조회 가능하다.
- 비로그인 사용자도 검색 가능하되, 이름/연락처 등 민감정보는 마스킹한다.
- 수령완료 본인 확인은 신분증 이름 + 등록 연락처 + 시스템 발급 수령 코드로 한다.
- 대리 수령은 허용하지 않는다.
- 수령 대기 자동 취소 기본값은 3일이다.
- 장기 미수령/폐기 검토 기준 기본값은 30일이다.
- 장기 미수령 기준 기간은 운영관리자가 설정한다.
- 기준 기간 경과 시 시스템이 알림을 생성한다.
- 폐기예정 상태 전환은 보관소관리자가 수동으로 처리한다.

## 5. 테이블 설계

### 5.1 users

사용자 계정과 단일 역할을 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 사용자 ID |
| email | varchar unique | 학교 이메일 |
| password_hash | varchar | 비밀번호 해시 |
| name | varchar | 이름 |
| contact | varchar | 연락처 |
| role | enum | 일반사용자, 보관소관리자, 운영관리자 |
| pending_approval | boolean | 보관소관리자 승인 대기 여부 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

정책:

- 회원가입 시 선택 가능한 역할은 일반사용자, 보관소관리자다.
- 보관소관리자는 가입 직후 `pending_approval = true`다.
- 운영관리자는 일반 회원가입으로 만들지 않고, 관리자 기능 또는 seed로 생성한다.

### 5.2 lost_reports

분실 신고를 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 분실 신고 ID |
| reporter_id | uuid fk users.id | 신고자 |
| reporter_name | varchar | 신고 당시 이름 스냅샷 |
| reporter_contact | varchar | 신고 당시 연락처 |
| item_name | varchar | 물품명 |
| category | varchar | 카테고리 |
| lost_place | varchar | 분실 장소 |
| lost_at | timestamptz | 분실 일시 |
| description | text | 상세 설명 |
| status | enum | 접수, 매칭후보있음, 찾기완료, 종료 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### 5.3 found_items

습득물을 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 습득물 ID |
| finder_id | uuid fk users.id nullable | 습득자 |
| finder_name | varchar nullable | 습득 당시 이름 스냅샷 |
| finder_contact | varchar nullable | 습득 당시 연락처 |
| item_name | varchar | 물품명 |
| category | varchar | 카테고리 |
| found_place | varchar | 습득 장소 |
| found_at | timestamptz | 습득 일시 |
| description | text | 상세 설명 |
| image_url | text nullable | 업로드 이미지 URL |
| storage_location | varchar nullable | 보관 위치 |
| status | enum | 등록, 보관중, 수령대기, 수령완료, 폐기예정 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

### 5.4 matches

분실 신고와 습득물의 매칭 후보를 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 매칭 ID |
| report_id | uuid fk lost_reports.id | 분실 신고 |
| item_id | uuid fk found_items.id | 습득물 |
| status | enum | 활성, 확인요청중, 승인, 반려, 비활성 |
| score | numeric nullable | 유사도 점수 |
| reject_reason | text nullable | 반려 사유 |
| requested_at | timestamptz nullable | 확인 요청일 |
| reviewed_at | timestamptz nullable | 승인/반려일 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

제약:

- `(report_id, item_id)` unique
- 하나의 분실 신고에는 `확인요청중` 또는 `승인` 상태 매칭이 동시에 1건만 존재한다.

PostgreSQL 조건부 unique index 예시:

```sql
CREATE UNIQUE INDEX unique_active_request_per_report
ON matches(report_id)
WHERE status IN ('확인요청중', '승인');
```

### 5.5 pickups

수령 대기 및 수령 완료 정보를 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 수령 ID |
| match_id | uuid fk matches.id | 매칭 |
| report_id | uuid fk lost_reports.id | 분실 신고 |
| item_id | uuid fk found_items.id | 습득물 |
| pickup_code | varchar | 시스템 발급 수령 코드 |
| status | enum | 수령대기, 수령완료, 취소 |
| waiting_started_at | timestamptz | 수령 대기 시작일 |
| auto_cancel_at | timestamptz | 자동 취소 예정일 |
| completed_at | timestamptz nullable | 수령 완료일 |
| cancelled_at | timestamptz nullable | 취소일 |
| cancel_reason | enum nullable | 분실자취소, 관리자취소, 시스템자동취소 |
| verifier_id | uuid fk users.id nullable | 수령완료 처리 관리자 |

### 5.6 notifications

사용자 알림함에 표시할 알림을 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 알림 ID |
| user_id | uuid fk users.id | 수신자 |
| type | enum | 알림 유형 |
| title | varchar | 제목 |
| message | text | 내용 |
| link | text nullable | 이동 링크 |
| is_read | boolean | 읽음 여부 |
| created_at | timestamptz | 생성일 |

### 5.7 system_configs

서비스 전체 운영 기준값을 저장한다.
싱글톤 테이블처럼 row 하나만 사용한다.

현재 프론트 Mock 코드도 `config` 객체를 Mock DB에 저장하고, 관리자/보관소관리자 설정 화면에서 값을 조회/수정한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | int pk | 설정 ID, 기본 1 |
| long_unclaimed_days | int | 장기 미수령/폐기 검토 기준일, 기본 30 |
| pickup_auto_cancel_days | int | 수령 대기 자동 취소 기준일, 기본 3 |
| match_date_range_days | int | 매칭 날짜 근접 기준일, 기본 7 |
| updated_at | timestamptz | 수정일 |

정책:

- 값 변경을 관리자 화면에서 할 수 있으므로 DB로 관리한다.
- 코드 상수로 두면 값 변경 시 재배포가 필요하므로 현재 요구사항과 맞지 않는다.

## 6. API 명세 초안

공통:

- 응답 Content-Type: `application/json`
- 인증 필요 API는 `Authorization: Bearer <token>` 사용
- 인증 실패: `401`
- 권한 부족: `403`
- 비즈니스 규칙 충돌: `409`

오류 응답:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "오류 메시지"
  }
}
```

### 6.1 Auth

```text
POST /auth/signup
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/change-password
```

### 6.2 Lost Reports

```text
POST   /reports
GET    /reports/my
GET    /reports/:reportId
PATCH  /reports/:reportId
DELETE /reports/:reportId
POST   /reports/:reportId/finalize
```

### 6.3 Found Items

```text
POST   /items
GET    /items/my
GET    /items
GET    /items/:itemId
DELETE /items/:itemId
PATCH  /items/:itemId/storage
PATCH  /items/:itemId/status
```

### 6.4 Matches

```text
GET  /reports/:reportId/matches
POST /matches/:matchId/confirm
POST /matches/:matchId/approve
POST /matches/:matchId/reject
POST /items/:itemId/claim
```

### 6.5 Search

```text
GET /search/lost?category=&place=&dateFrom=&dateTo=&keyword=&status=
GET /search/found?category=&place=&dateFrom=&dateTo=&keyword=&status=
```

정책:

- 비로그인 사용자도 검색 가능
- 비로그인 응답은 이름/연락처 등 민감정보 마스킹
- 일반 검색에서 수령완료 습득물은 제외
- 일반 검색에서 등록 상태 습득물은 제외
- 관리자 목록 API에서는 모든 상태 조회 가능

### 6.6 Pickups

```text
GET  /pickups/:pickupId
GET  /pickups/by-report/:reportId
GET  /pickups/waiting
POST /pickups/:pickupId/verify
POST /pickups/:pickupId/complete
POST /pickups/:pickupId/cancel
```

### 6.7 Notifications

```text
GET   /notifications
GET   /notifications/unread-count
PATCH /notifications/:notificationId/read
PATCH /notifications/read-all
```

### 6.8 Admin

```text
GET   /admin/reports
GET   /admin/items
GET   /admin/stats
GET   /admin/unclaimed
GET   /admin/config
PATCH /admin/config
GET   /admin/manager-approvals
POST  /admin/manager-approvals/:userId/approve
POST  /admin/manager-approvals/:userId/reject
POST  /admin/admin-users
```

### 6.9 Manager

```text
GET   /manager/items
GET   /manager/confirmations
GET   /manager/pickups
GET   /manager/unclaimed
PATCH /manager/items/:itemId/disposal
```

### 6.10 Uploads

```text
POST /api/uploads/image
```

정책:

- 기본 구현은 EC2 로컬 파일 저장 후 `/uploads/파일명` 형태의 상대경로 imageUrl 반환
- 필요 시 S3 또는 presigned URL 방식으로 변경 가능

## 7. 자동 처리 작업

### 7.1 수령 대기 자동 취소

- 기준: `system_configs.pickup_auto_cancel_days`, 기본 3일
- 대상: status가 수령대기이고 auto_cancel_at이 지난 pickup
- 처리:
  - pickup 상태 취소
  - found_item 상태 보관중
  - lost_report 상태 매칭후보있음
  - match 상태 활성
  - 알림 생성

### 7.2 장기 미수령/폐기 검토 알림

- 기준: `system_configs.long_unclaimed_days`, 기본 30일
- 대상: 보관중 또는 수령대기 상태로 기준일을 넘긴 습득물
- 처리:
  - 보관소관리자에게 알림 생성
  - 실제 폐기예정 전환은 보관소관리자가 수동 처리

## 8. 백엔드 구현 순서

1. NestJS 프로젝트 생성
2. Docker Compose로 backend/postgres 구성
3. Prisma + PostgreSQL 연결
4. Enum/테이블 schema 작성
5. Auth/JWT 구현
6. Reports/Items CRUD 구현
7. Matching 서비스 구현
8. Pickups 상태 전환 구현
9. Search/Notifications 구현
10. Admin/Manager API 구현
11. 로컬 이미지 업로드 구현
12. 프론트 `VITE_USE_MOCK=false` 연결
