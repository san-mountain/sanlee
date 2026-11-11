# sanlee.kr

San Lee 포트폴리오 사이트.

- `/` `/about` `/works` `/writing` `/contact`: 일반 포트폴리오
- `/explore`: 같은 포트폴리오를 사이버펑크 3D 도시로 탐험하는 작품 (NEO-SEOUL 2087)

## 내용 고치기

시·일기·작업은 사이트의 **`/admin`** 에서 쓰고 고치고 올릴 수 있습니다(사이트 주인만, 비밀번호 로그인).
저장하면 이 저장소의 main에 커밋이 하나 생기고, Vercel이 사이트를 다시 만들어 1~2분 뒤 반영됩니다.

- 시: `src/content/poems.json` (원문 한국어, 최근 것이 위)
- 일기: `src/content/diary.json` (오래된 것이 위). `/admin`에서 `{중괄호}`로 감싼 곳은 저장할 때 `⟦글자 수⟧`로 바뀌어 원문이 남지 않아요
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

## 실행

```bash
npm install
npm run dev
```
