# 국민대 분실물 보관소 - 웹 프론트엔드

국민대학교 캠퍼스 내 **분실물 신고 및 보관소 연동 시스템**의 웹 프론트엔드(React SPA)입니다.
현재 저장소의 `backend/` NestJS API 서버와 연결하여 사용할 수 있고, 필요하면 Mock 모드도 사용할 수 있습니다.

## 로컬 실행

백엔드와 PostgreSQL을 먼저 실행한 뒤 PowerShell에서 실행합니다.

```powershell
cd C:\01_Dev\AWSCloudComputing\web
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

## 환경변수

| 변수 | 설명 | 기본값 |
|---|---|---|
| `VITE_API_BASE_URL` | 백엔드 API 베이스 URL | `http://localhost:3000/api` |
| `VITE_USE_MOCK` | `true` 면 모든 API 호출이 Mock 어댑터로 라우팅. `false` 면 실제 백엔드 호출 | `false` |
| `VITE_AUTH_HEADER_NAME` | 토큰 첨부 헤더 이름 | `Authorization` |

## Mock ↔ 실제 모드 전환

- 실제 백엔드 사용: `.env`에서 `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://localhost:3000/api` 설정 후 `npm.cmd run dev` 재시작
- Mock 사용: `.env`에서 `VITE_USE_MOCK=true` 설정 후 `npm.cmd run dev` 재시작
- Mock 데이터는 `localStorage` 에 영속화. 헤더의 **[Mock 초기화]** 버튼으로 시드값 리셋

## 데모 계정

실제 백엔드에서는 먼저 `backend` 폴더에서 `npm.cmd run prisma:seed`를 실행합니다. Mock 모드와 실제 백엔드 모두 비밀번호는 `password`입니다.

| 역할 | 이메일 |
|---|---|
| 일반사용자 김민준 | `user1@kookmin.ac.kr` |
| 일반사용자 이서연 | `user2@kookmin.ac.kr` |
| 일반사용자 박지호 | `user3@kookmin.ac.kr` |
| 일반사용자 최수아 | `user4@kookmin.ac.kr` |
| 보관소 관리자 | `manager@kookmin.ac.kr` |
| 승인 대기 관리자 | `manager.pending@kookmin.ac.kr` |
| 운영 관리자 | `admin@kookmin.ac.kr` |

실제 백엔드 시드에는 한글 데모 물품과 처리 단계가 포함되어 있습니다.

| 확인할 흐름 | 로그인 계정 | 예시 |
|---|---|---|
| 매칭 후보 요청 | 김민준 (`user1`) | `검정 카드지갑` |
| 후보 없음/완료 이력 | 이서연 (`user2`) | `빨간 체크 머플러`, `남색 접이식 우산` |
| 승인 대기 처리 | 박지호 (`user3`), 보관소 관리자 | `하늘색 텀블러` |
| 수령 코드/수령 완료 | 최수아 (`user4`), 보관소 관리자 | `흰색 무선 이어폰` / 코드 `246810` |
| 폐기 예정 조회 | 보관소 관리자, 운영 관리자 | `오래된 검정 장우산` |

## API 명세

[../docs/api-spec.md](../docs/api-spec.md) 참고.

## 도메인 타입 정의

`src/types/` 디렉토리에 모든 도메인 타입이 정의되어 있습니다. 백엔드 응답 스키마는 이 타입을 그대로 따르도록 맞춰주세요.

## 빌드 / 배포

```bash
npm run build      # dist/ 폴더 생성
```

EC2 배포용 Docker 빌드는 `dist/` 정적 산출물을 NestJS 컨테이너에 포함합니다. 배포 후 브라우저는 `http://EC2-공인-IP`에서 화면을 열고, 같은 서버의 `/api`로 API를 호출합니다.

## 백엔드 연동 체크리스트

- [x] `VITE_API_BASE_URL` 을 로컬 백엔드 API 주소로 설정
- [x] `VITE_USE_MOCK=false` 로 전환 가능
- [x] CORS 설정
- [x] 인증 토큰 발급 엔드포인트 연결 (`POST /auth/login`)
- [x] 알림 API 연결 (`/notifications`)
- [x] 이미지 업로드 API 연결 (`POST /uploads/image`)

## 디렉토리 구조

```
src/
├── api/         # 도메인별 API 모듈 (Mock/실제 분기 포함) + mock/
├── components/  # common, layout, domain
├── pages/       # auth, search, reports, items, pickups, notifications, manager, admin
├── hooks/       # useAuth, useSystemConfig
├── store/       # Zustand: authStore, toastStore
├── types/       # 도메인 타입 정의
└── utils/       # date, mask, categories
```

## 핵심 설계 원칙

- AWS 리소스를 직접 만들거나 호출하는 코드 없음 (presigned URL 발급, SQS 직접 전송, DynamoDB SDK 등 일체 없음)
- 모든 API 호출은 `src/api/` 의 추상화 레이어 경유
- Mock 핸들러가 실제 시스템처럼 자동 상태 전환 및 마스킹을 수행 (`src/api/mock/handlers.ts`)
- 18개 비즈니스 룰을 UI에서 선제적으로 검증 (백엔드도 검증)
