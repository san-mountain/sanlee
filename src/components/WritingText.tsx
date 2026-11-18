import { isBreak, proseBlocks } from "@/lib/writing";

// 글 본문. 시는 연(빈 줄)마다 한 덩어리, 줄바꿈 그대로(산문시는 바깥 .prose 가 문단으로 바꾼다).
// 들여쓰기 분류(에세이·소설)는 줄 하나가 문단 하나이고 문단 첫머리를 한 칸 들여 쓴다. 빈 줄은 장면이 바뀌는 큰 여백.
export default function WritingText({ body, indent }: { body: string; indent: boolean }) {
  if (indent) {
    return (
      <>
        {proseBlocks(body).map((block, j) => (
          <div key={j} className="prose-block">
            {block.map((l, k) =>
              isBreak(l) ? (
                <p key={k} className="scene-break" aria-label="장면 전환">
                  *&nbsp;&nbsp;*&nbsp;&nbsp;*
                </p>
              ) : (
                <p key={k} className="para">
                  {l}
                </p>
              )
            )}
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      {body.split("\n\n").map((stanza, j) => (
        <p key={j} className="stanza">
          {stanza}
        </p>
      ))}
    </>
  );
}
