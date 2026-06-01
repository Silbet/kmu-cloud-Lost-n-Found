# API 명세서

API 기본 경로는 `/api`입니다. 모든 응답은 `Content-Type: application/json`. 인증 필요 엔드포인트는 `Authorization: Bearer <token>` 헤더 첨부.

## 응답 규약

- 성공: 2xx + JSON 본문
- 클라이언트 오류: 4xx + `{ error: { code, message } }`
- 충돌(비즈니스 룰 위반): 409 + `{ error: { code, message } }`
- 인증 실패: 401, 권한 부족: 403
- 서버 오류: 5xx

## 인증

```
POST   /api/auth/signup    { email, password, name, contact, roles } → { user }
POST   /api/auth/login     { email, password } → { token, user }
POST   /api/auth/logout
GET    /api/auth/me        → User
```

## 분실 신고

```
POST   /api/reports              { itemName, category, lostPlace, lostDate, description, reporterContact } → LostReport
GET    /api/reports/my           → LostReport[]
GET    /api/reports/:reportId    → LostReport
PATCH  /api/reports/:reportId    → LostReport
  # 백엔드 검증:
  # - 상태가 접수/매칭후보있음일 때만 허용
  # - 활성 확인 요청이 있으면 409 Conflict
  # - 성공 시 매칭 후보 재계산 자동 트리거
DELETE /api/reports/:reportId
  # - 상태가 접수/매칭후보있음일 때만 허용
  # - CASCADE 매칭 후보 삭제
POST   /api/reports/:reportId/finalize  → LostReport
  # 찾기완료 → 종료 (보관소 관리자 수동 호출)
```

## 습득물

```
POST   /api/items                 → FoundItem
GET    /api/items/my              → FoundItem[]
GET    /api/items                 → FoundItem[]   # 보관소 관리자
DELETE /api/items/:itemId         # 등록 상태에서만 가능
PATCH  /api/items/:itemId/storage  { storageLocation } → FoundItem
  # 보관 위치 입력 시 등록 → 보관중 자동 전환 + 매칭 트리거
PATCH  /api/items/:itemId/status   { status } → FoundItem
```

## 이미지 업로드

```
POST   /api/uploads/image  (multipart/form-data: file) → { imageUrl }
```

## 매칭 / 확인 요청

```
GET    /api/reports/:reportId/matches  → Match[] (item 포함)
POST   /api/matches/:matchId/confirm   → Match
  # 분실 신고당 활성 확인 요청 1건 제한 (409 Conflict)
POST   /api/matches/:matchId/approve   → Match
  # Pickup 자동 생성, 수령 코드 발급, 분실자에게 알림
POST   /api/matches/:matchId/reject    { reason? } → Match
  # 매칭 상태 '활성'으로 복귀, rejectReason 저장, 알림
```

## 검색 (비로그인 가능)

```
GET    /api/search/lost   ?category=&place=&dateFrom=&dateTo=&keyword=
GET    /api/search/found  ?category=&place=&dateFrom=&dateTo=&keyword=
  # 비로그인 호출 시 백엔드가 민감정보 마스킹
  # 수령완료 습득물은 응답에서 제외
  # 매칭 후보는 습득물이 '보관중' 이상일 때만 노출
```

## 수령

```
GET    /api/pickups/:pickupId           → Pickup
GET    /api/pickups/waiting             → Pickup[]   # 보관소 관리자
POST   /api/pickups/:pickupId/verify    { name, contact, code }
  → { allMatched: boolean, mismatches: ('name'|'contact'|'code')[] }
POST   /api/pickups/:pickupId/complete  → Pickup
  # 자동: 습득물 수령완료, 분실 신고 찾기완료, 매칭 비활성
POST   /api/pickups/:pickupId/cancel    { reason: CancelReason } → Pickup
  # 자동: 습득물 보관중 복귀, 분실 신고 매칭후보있음 복귀, 매칭 활성 복귀
```

## 알림

```
GET    /api/notifications              → Notification[]
GET    /api/notifications/unread-count → { count: number }
PATCH  /api/notifications/:id/read     → Notification
PATCH  /api/notifications/read-all     → { updated: number }
```

## 운영 관리자

```
GET    /api/admin/reports     → LostReport[]
GET    /api/admin/items       → FoundItem[]
GET    /api/admin/stats       → { lostReportsByStatus, foundItemsByStatus, recentTrend }
GET    /api/admin/unclaimed   → FoundItem[]
GET    /api/admin/config      → SystemConfig
PATCH  /api/admin/config      → SystemConfig
```

## 도메인 타입

`src/types/` 디렉토리의 TypeScript 인터페이스가 그대로 API 스키마입니다.

| 타입 | 파일 |
|---|---|
| User, UserRole | `src/types/user.ts` |
| LostReport, LostReportStatus | `src/types/report.ts` |
| FoundItem, FoundItemStatus | `src/types/item.ts` |
| Match, MatchStatus | `src/types/match.ts` |
| Pickup, PickupStatus, CancelReason | `src/types/pickup.ts` |
| Notification, NotificationType | `src/types/notification.ts` |
| SystemConfig | `src/types/config.ts` |

## 상태 전환 요약

### 분실 신고
- `접수` → `매칭후보있음` (매칭 후보 생성 시 자동)
- `매칭후보있음` → `찾기완료` (수령 완료 시 자동)
- `찾기완료` → `종료` (보관소 관리자 수동, `POST /api/reports/:id/finalize`)

### 습득물
- `등록` → `보관중` (보관 위치 입력 시 자동, `PATCH /api/items/:id/storage`)
- `보관중` → `수령대기` (확인 요청 승인 시 자동)
- `수령대기` → `수령완료` (수령 완료 시 자동)
- `수령대기` → `보관중` (수령 대기 취소 시 자동)
- `보관중` → `폐기예정` (보관소 관리자 수동)

### 매칭
- `활성` → `확인요청중` (분실자 확인 요청)
- `확인요청중` → `승인` (관리자 승인, Pickup 생성)
- `확인요청중` → `활성` (관리자 반려, `rejectReason` 기록)
- `승인` → `비활성` (수령 완료)
- `승인` → `활성` (수령 대기 취소)

## 알림 발송 트리거

| 이벤트 | 수신자 | 타입 |
|---|---|---|
| 매칭 후보 생성 | 분실자 | `매칭후보생성` |
| 확인 요청 승인 | 분실자 | `확인요청승인` |
| 확인 요청 반려 | 분실자 | `확인요청반려` |
| 수령 대기 (N-1)일 경과 | 분실자 | `수령자동취소임박` |
| 수령 대기 취소 | 분실자 | `수령대기취소` |
| 보관 N일 경과 | 보관소 관리자 | `폐기검토필요` |
