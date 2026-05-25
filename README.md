# 국민대 분실물 보관소

국민대학교 캠퍼스 내 분실물 신고 및 보관소 연동 시스템 저장소입니다.

React 프론트엔드와 NestJS 백엔드, PostgreSQL DB가 구성되어 있습니다. 로컬에서는 PostgreSQL만 Docker로 실행하고 프론트엔드와 백엔드는 개발 서버로 실행합니다.

## 디렉토리 구조

```text
.
├── docs/   # 기획 문서, 수정사항 정리, API 명세, 이벤트 스토밍 자료
├── backend/ # NestJS 기반 백엔드 API 서버
└── web/    # React 기반 웹 프론트엔드
```

## 웹 프론트엔드

웹 앱 실행과 환경변수 설정은 [web/README.md](web/README.md)를 참고하세요.

```bash
cd web
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

## 백엔드

백엔드 실행 방법은 [backend/README.md](backend/README.md)를 참고하세요.

## 문서

- [API 명세](docs/api-spec.md)
- [이벤트 스토밍 이미지](docs/event_storming.png)
