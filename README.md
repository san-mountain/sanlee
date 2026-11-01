# sanlee.kr

San Lee 포트폴리오 사이트.

- `/` `/about` `/works` `/contact`: 일반 포트폴리오
- `/explore`: 같은 포트폴리오를 사이버펑크 3D 도시로 탐험하는 작품 (NEO-SEOUL 2087)

## 내용 고치기

- 소개, 작업, 연락처: `src/data/site.ts` (한국어/영어 쌍으로)
- 동상 스토리와 대사: `src/explore/story.ts`
- 작업 사진: `public/works/` 에 넣고 `site.ts`의 `image`에 경로 적기

## 실행

```bash
npm install
npm run dev
```
