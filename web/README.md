# 국민대 분실물 보관소 - 웹 프론트엔드

국민대학교 캠퍼스 내 **분실물 신고 및 보관소 연동 시스템**의 웹 프론트엔드(React SPA)입니다.
백엔드/AWS 인프라는 다른 팀원이 담당하며, 본 저장소는 순수 프론트엔드 산출물입니다.

Mock 모드에서 모든 흐름이 실제처럼 동작하며, 환경변수 토글 하나로 백엔드 연결이 가능합니다.

## 로컬 실행

```bash
npm install
cp .env.example .env
npm run dev
```

## 환경변수

| 변수 | 설명 | 기본값 |
|---|---|---|
| `VITE_API_BASE_URL` | 백엔드 API 베이스 URL | `http://localhost:3000` |
| `VITE_USE_MOCK` | `true` 면 모든 API 호출이 Mock 어댑터로 라우팅. `false` 면 실제 백엔드 호출 | `true` |
| `VITE_AUTH_HEADER_NAME` | 토큰 첨부 헤더 이름 | `Authorization` |

## Mock ↔ 실제 모드 전환

- `.env` 에서 `VITE_USE_MOCK=false` 로 변경 + `VITE_API_BASE_URL` 을 실제 API Gateway URL로 설정 → `npm run dev` 재시작
- Mock 데이터는 `localStorage` 에 영속화. 헤더의 **[Mock 초기화]** 버튼으로 시드값 리셋

## 테스트 계정 (Mock 모드, 비밀번호는 모두 `password`)

| 역할 | 이메일 |
|---|---|
| 분실자 | `lost1@kookmin.ac.kr` |
| 습득자 | `find1@kookmin.ac.kr` |
| 보관소 관리자 | `manager@kookmin.ac.kr` |
| 운영 관리자 | `admin@kookmin.ac.kr` |
| 분실+습득 겸직 | `both@kookmin.ac.kr` |

## API 명세

[../docs/api-spec.md](../docs/api-spec.md) 참고.

## 도메인 타입 정의

`src/types/` 디렉토리에 모든 도메인 타입이 정의되어 있습니다. 백엔드 응답 스키마는 이 타입을 그대로 따르도록 맞춰주세요.

## 빌드 / 배포

```bash
npm run build      # dist/ 폴더 생성
```

`dist/` 폴더의 정적 산출물을 S3 정적 호스팅 버킷에 업로드하거나 CloudFront에 연결하세요.

## 백엔드 연동 체크리스트

- [ ] `VITE_API_BASE_URL` 을 API Gateway URL로 설정
- [ ] `VITE_USE_MOCK=false` 로 변경
- [ ] CORS 설정 (백엔드)
- [ ] 인증 토큰 발급 엔드포인트 호환성 확인 (`POST /auth/login` 응답에 `{ token, user }` 포함)
- [ ] 알림 발송 로직 (SNS 등) 구현 확인 — 프론트는 `/notifications` 엔드포인트만 사용
- [ ] 이미지 업로드 엔드포인트 (`POST /uploads/image`, multipart) 또는 presigned URL 방식 결정. 프론트는 `uploadImage()` 함수의 시그니처만 유지하면 됨.

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
