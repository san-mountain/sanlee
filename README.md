# sanlee.kr

San Lee 포트폴리오 사이트.

- `/` `/about` `/works` `/writing` `/contact`: 일반 포트폴리오
- `/explore`: 같은 포트폴리오를 사이버펑크 3D 도시로 탐험하는 작품 (NEO-SEOUL 2087)

## 내용 고치기

시·작업은 사이트의 **`/admin`** 에서 쓰고 고치고 올릴 수 있습니다(사이트 주인만, 비밀번호 로그인).
저장하면 이 저장소의 main에 커밋이 하나 생기고, Vercel이 사이트를 다시 만들어 1~2분 뒤 반영됩니다.

- 시: `src/content/poems.json` (원문 한국어, 최근 것이 위)
- 일기: 사이트에서 내렸어요. 원문 `src/content/diary.json`은 저장소에 그대로 남아 있고, 화면 코드(`src/components/Diary.tsx`)는 git 기록에서 되살릴 수 있어요
- 작업: `src/content/works.json` + 사진 `public/works/*.webp` (최근 것이 위)
  - 사진을 올리면 그리드용 작은 사진(`public/works/thumb/`, 폭 600px)과 사진의 평균색(`color`)도 같이 만들어져요. 사진을 손으로 넣을 때는 이 둘도 같이 넣어야 해요
- 소개, 연락처, 화면 문구: `src/data/site.ts` (한국어/영어 쌍으로)
- 동상 스토리와 대사: `src/explore/story.ts`

### /admin 설정 (한 번만)

Vercel 프로젝트 > Settings > Environment Variables 에 두 값을 넣고(Production) 다시 배포합니다.

- `ADMIN_PASSWORD`: 관리 화면 비밀번호. 다른 곳에 쓰지 않는 긴 문장으로(8자 이상)
- `GITHUB_TOKEN`: GitHub > Settings > Developer settings > Fine-grained tokens 에서 만든 토큰.
  Repository access는 `san-mountain/sanlee` 하나만, Permissions는 **Contents: Read and write** 하나만

비밀번호나 토큰을 바꾸면 모든 기기의 로그인이 풀립니다.

### 방문 기록 (/admin 의 "방문" 탭)

사이트의 각 페이지가 열릴 때 `/api/visit` 에 짧은 기록을 보내고, 관리 화면의 **방문** 탭에서 최근 7·30·90일을 볼 수 있어요
(방문자, 방문, 페이지 본 횟수, 날마다·시간대별 방문, 많이 본 페이지, 어디서 왔나, 나라, 기기, 사이트 언어, 최근 방문).

- 쿠키를 쓰지 않고, IP·브라우저 정보 원문은 남기지 않아요. 방문자는 하루 단위로만 알아봐요(되돌릴 수 없는 하루짜리 표)
- 관리 화면에 로그인한 기기의 방문과 검색 로봇은 세지 않아요
- 기록은 Upstash Redis에 하루 키 두 개로 쌓이고 400일 뒤 지워져요
- **최근 방문** 목록: 방문 하나하나의 시간, 도시(인터넷 회선 위치로 짐작), 기기·OS·브라우저, 들어온 곳, 본 페이지 순서, 머문 시간. IP 없이 90일 동안만 남아요

설정(한 번만): Vercel 프로젝트 > Storage(또는 Marketplace)에서 **Upstash for Redis** 무료 데이터베이스를 만들어 이 프로젝트에 연결하고 다시 배포합니다.
`KV_REST_API_URL`, `KV_REST_API_TOKEN` 이 저절로 들어가요(`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` 이름도 받아요).
설정 전에는 기록을 보내도 아무 일도 하지 않고, 방문 탭에 설정 방법이 나와요.

## 실행

```bash
npm install
npm run dev
```
