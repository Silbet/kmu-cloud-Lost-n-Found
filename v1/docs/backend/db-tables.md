# DB Tables

백엔드 DB 테이블 검토용 문서다.

## 현재 결정

- 계정 하나는 역할 하나만 가진다.
- `user_roles` 테이블은 사용하지 않는다.
- 사용자 역할은 `users.role` 단일 컬럼으로 관리한다.
- 운영 설정값은 코드 상수가 아니라 DB의 `system_configs` 테이블에서 관리한다.
- 현재 프론트 Mock 코드도 `config` 객체를 Mock DB에 저장하고, 관리자/보관소관리자 설정 화면에서 조회/수정한다.

## 1. users

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

## 2. lost_reports

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

## 3. found_items

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

## 4. matches

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

## 5. pickups

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

## 6. notifications

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

## 7. system_configs

서비스 전체 운영 기준값을 저장한다.
싱글톤 테이블처럼 row 하나만 사용한다.

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
