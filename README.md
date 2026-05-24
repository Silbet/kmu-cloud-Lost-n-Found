# 국민대 분실물 보관소

국민대학교 캠퍼스 내 분실물 신고 및 보관소 연동 시스템 저장소입니다.

현재는 웹 프론트엔드가 먼저 구성되어 있으며, 이후 백엔드와 AWS 인프라 코드가 같은 저장소에 추가될 예정입니다.

## 디렉토리 구조

```text
.
├── docs/   # 기획 문서, 수정사항 정리, API 명세, 이벤트 스토밍 자료
└── web/    # React 기반 웹 프론트엔드
```

## 웹 프론트엔드

웹 앱 실행과 환경변수 설정은 [web/README.md](web/README.md)를 참고하세요.

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

## 문서

- [API 명세](docs/api-spec.md)
- [이벤트 스토밍 이미지](docs/event_storming.png)
