// 사이트 주인만 /admin 에 들어올 수 있게 하는 비밀번호 로그인.
// 필요한 환경 변수(Vercel 프로젝트 설정 > Environment Variables):
//   ADMIN_PASSWORD  관리 화면 비밀번호(길게)
//   GITHUB_TOKEN    저장소에 글과 사진을 올릴 GitHub 토큰(이 저장소의 Contents 읽기/쓰기만)
// 로그인하면 30일 동안 유지되는 서명된 쿠키를 준다. 비밀번호나 토큰을 바꾸면 모든 로그인이 풀린다.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "sanlee_admin";
const DAYS = 30;

const password = () => process.env.ADMIN_PASSWORD ?? "";
export const configured = () => password().length >= 8 && !!process.env.GITHUB_TOKEN;

function key() {
  return createHash("sha256")
    .update(`sanlee-admin\0${password()}\0${process.env.ADMIN_SECRET ?? process.env.GITHUB_TOKEN ?? ""}`)
    .digest();
}
const sign = (exp: string) => createHmac("sha256", key()).update(exp).digest("base64url");
const same = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

export function checkPassword(input: unknown) {
  if (!configured() || typeof input !== "string") return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return same(h(input), h(password()));
}

export function newSession() {
  const exp = String(Date.now() + DAYS * 864e5);
  return { value: `${exp}.${sign(exp)}`, maxAge: DAYS * 86400 };
}

export function validSession(value: string | undefined) {
  if (!value || !configured()) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || +exp < Date.now()) return false;
  return same(Buffer.from(sig), Buffer.from(sign(exp)));
}

export async function isOwner() {
  return validSession((await cookies()).get(COOKIE)?.value);
}

// 다른 사이트에서 몰래 보낸 요청(CSRF)을 막는다: 쿠키가 SameSite=Strict이고, 요청 출처도 이 사이트여야 한다
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
