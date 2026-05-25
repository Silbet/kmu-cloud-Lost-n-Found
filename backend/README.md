# Lost and Found Backend

NestJS + Prisma + PostgreSQL 기반 백엔드 API 서버입니다.

## 먼저 알아둘 것

백엔드는 PostgreSQL DB가 있어야 실행됩니다.
로컬 실행 방법은 두 가지입니다.

```text
방법 1. 추천: DB는 Docker Desktop으로 실행, 백엔드는 npm으로 실행
방법 2. Docker 없이: PostgreSQL을 PC에 직접 설치하고, 백엔드는 npm으로 실행
```

팀 프로젝트에서는 방법 1을 추천합니다.
Docker Desktop이 없다면 방법 2를 사용합니다.

## 공통 준비

PowerShell에서 실행합니다.

```powershell
cd C:\01_Dev\AWSCloudComputing\backend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run prisma:generate
```

PowerShell에서 `npm`이 막히면 `npm.cmd`를 사용하세요.

## 방법 1. 추천 실행 방법

이 방법은 PostgreSQL만 Docker로 실행하고, 백엔드는 내 PC에서 `npm.cmd run dev`로 실행합니다.
개발 중 코드 수정 반영과 로그 확인이 쉬워서 가장 추천합니다.

### 1. Docker Desktop 설치 및 실행

Windows에서는 보통 Docker Desktop이 필요합니다.
아래 공식 페이지에서 Docker Desktop for Windows를 설치합니다.

```text
https://www.docker.com/products/docker-desktop/
```

설치 후 Docker Desktop을 실행한 상태에서 아래 명령을 사용합니다.

### 2. PostgreSQL 실행

루트 폴더에서 PostgreSQL 컨테이너를 실행합니다.

```powershell
cd C:\01_Dev\AWSCloudComputing
docker compose up postgres
```

이 터미널은 DB 실행용으로 켜둡니다.

### 3. 백엔드 실행

새 PowerShell 창을 열고 백엔드를 실행합니다.

```powershell
cd C:\01_Dev\AWSCloudComputing\backend
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
npm.cmd run dev
```

`prisma:seed`를 실행하면 화면 확인용 계정이 생성됩니다. 비밀번호는 모두 `password`입니다.

```text
일반사용자: user1@kookmin.ac.kr
보관소 관리자: manager@kookmin.ac.kr
승인 대기 관리자: manager.pending@kookmin.ac.kr
운영 관리자: admin@kookmin.ac.kr
```

확인 주소:

```text
http://localhost:3000/health
```

정상 응답:

```json
{ "status": "ok" }
```

## 방법 2. Docker 없이 실행

Docker Desktop이 없다면 PostgreSQL을 직접 설치해도 됩니다.

### 1. PostgreSQL 설치

PostgreSQL 16 또는 17을 설치합니다.
설치 중 비밀번호를 기억해두세요.

### 2. DB와 계정 생성

PostgreSQL 관리 도구에서 아래 값을 기준으로 DB를 만듭니다.

```text
DB 이름: lost_found
사용자: lost_found_user
비밀번호: lost_found_password
포트: 5432
```

### 3. .env 수정

`backend\.env`의 `DATABASE_URL`을 로컬 DB 주소로 맞춥니다.

```env
DATABASE_URL="postgresql://lost_found_user:lost_found_password@localhost:5432/lost_found?schema=public"
PORT=3000
JWT_SECRET="dev-secret-change-me"
UPLOAD_DIR="./uploads"
```

### 4. 백엔드 실행

```powershell
cd C:\01_Dev\AWSCloudComputing\backend
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
npm.cmd run dev
```

확인 주소:

```text
http://localhost:3000/health
```

## 자주 쓰는 명령

```text
npm.cmd run dev              # 백엔드 개발 서버 실행
npm.cmd run build            # 백엔드 빌드
npm.cmd run prisma:generate  # Prisma Client 생성
npm.cmd run prisma:migrate   # DB 마이그레이션 생성/적용
npm.cmd run prisma:deploy    # 이미 만든 마이그레이션 적용
npm.cmd run prisma:seed      # 기본 설정값/데모 계정 생성
```

## 포트

```text
백엔드: http://localhost:3000
PostgreSQL: localhost:5432
```
