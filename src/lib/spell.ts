// 맞춤법 검사(기본): 자주 틀리는 맞춤법·띄어쓰기·문장부호를 규칙으로 찾는다. 인터넷 없이 바로 돈다.
// 시에서 일부러 쓴 말도 있으니 고치라는 게 아니라 '이런 게 있어요' 하고 알려 주는 용도. 더 꼼꼼한 검사는 AI 검사(/api/admin/spell).

export type Issue = {
  from: number; // 본문에서의 위치(글자)
  to: number;
  original: string;
  suggestion: string; // 바꿀 말. 빈 문자열이면 지우기
  reason: string;
  kind: "맞춤법" | "띄어쓰기" | "문장부호" | "오타" | "다듬기";
  source?: "rule" | "ai";
};

// 한글 한 글자의 받침(종성) 번호. 0이면 받침 없음, 8이면 ㄹ
const jong = (ch: string) => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 ? c % 28 : -1;
};

type Rule = { re: RegExp; fix: (m: RegExpExecArray) => string | null; reason: string; kind: Issue["kind"]; group?: number };

// 낱말 앞뒤 경계(한글이 아닌 것)
const B = "(?<![가-힣])";

const WORDS: [string, string, string][] = [
  // 틀린 말, 바른 말, 이유
  ["몇일", "며칠", "'며칠'이 표준어예요"],
  ["몇 일", "며칠", "'며칠'이 표준어예요"],
  ["금새", "금세", "'금시에'가 줄어든 말이라 '금세'예요"],
  ["어떻해", "어떡해", "'어떻게 해'가 줄면 '어떡해'예요"],
  ["어떻하", "어떡하", "'어떻게 하'가 줄면 '어떡하'예요"],
  ["설겆이", "설거지", "'설거지'가 표준어예요"],
  ["오랫만", "오랜만", "'오래간만'이 줄어든 말이라 '오랜만'이에요"],
  ["희안", "희한", "'희한하다'가 맞아요"],
  ["내노라", "내로라", "'내로라하다'가 맞아요"],
  ["역활", "역할", "'역할(役割)'이 맞아요"],
  ["몇칠", "며칠", "'며칠'이 표준어예요"],
  ["어의없", "어이없", "'어이없다'가 맞아요"],
  ["어의가 없", "어이가 없", "'어이없다'의 '어이'예요"],
  ["곰곰히", "곰곰이", "'-이'로 끝나는 부사예요"],
  ["깨끗히", "깨끗이", "'-이'로 끝나는 부사예요"],
  ["틈틈히", "틈틈이", "'-이'로 끝나는 부사예요"],
  ["일일히", "일일이", "'-이'로 끝나는 부사예요"],
  ["번번히", "번번이", "'-이'로 끝나는 부사예요"],
  ["따뜻히", "따뜻이", "'-이'로 끝나는 부사예요"],
  ["느긋히", "느긋이", "'-이'로 끝나는 부사예요"],
  ["꼼꼼이", "꼼꼼히", "'-히'로 끝나는 부사예요"],
  ["솔직이", "솔직히", "'-히'로 끝나는 부사예요"],
  ["눈쌀", "눈살", "'눈살'이 맞아요"],
  ["뒷꿈치", "뒤꿈치", "뒤에 된소리가 오면 사이시옷을 쓰지 않아요"],
  ["윗층", "위층", "뒤에 거센소리가 오면 사이시옷을 쓰지 않아요"],
  ["윗쪽", "위쪽", "뒤에 된소리가 오면 사이시옷을 쓰지 않아요"],
  ["뒷편", "뒤편", "뒤에 거센소리가 오면 사이시옷을 쓰지 않아요"],
  ["뒷쪽", "뒤쪽", "뒤에 된소리가 오면 사이시옷을 쓰지 않아요"],
  ["구지", "굳이", "'굳이'가 맞아요"],
  ["짜집기", "짜깁기", "'짜깁기'가 맞아요"],
  ["왠일", "웬일", "'어찌 된'의 뜻이면 '웬'이에요"],
  ["왠만", "웬만", "'웬만하다'가 맞아요"],
  ["웬지", "왠지", "'왜인지'가 줄어든 말이라 '왠지'예요"],
  ["대려가", "데려가", "'데리다'에서 온 말이에요"],
  ["대려오", "데려오", "'데리다'에서 온 말이에요"],
  ["있슴", "있음", "명사형은 '-음'이에요"],
  ["없슴", "없음", "명사형은 '-음'이에요"],
  ["했슴", "했음", "명사형은 '-음'이에요"],
  ["되요", "돼요", "'되어요'가 줄면 '돼요'예요"],
  ["됬", "됐", "'되었'이 줄면 '됐'이에요"],
  ["되서", "돼서", "'되어서'가 줄면 '돼서'예요"],
  ["되버", "돼 버", "'되어 버리다'가 줄면 '돼 버리다'예요"],
  ["바램", "바람", "'바라다'의 명사형은 '바람'이에요(색이 바랜 뜻이면 그대로 두세요)"],
  ["가능한 빨리", "가능한 한 빨리", "'가능한 한'으로 써야 뜻이 통해요"],
  ["할려고", "하려고", "'-려고'가 맞아요"],
  ["갈려고", "가려고", "'-려고'가 맞아요"],
  ["볼려고", "보려고", "'-려고'가 맞아요"],
  ["올려고", "오려고", "'오다'에는 '-려고'가 붙어요(올리다의 뜻이면 그대로 두세요)"],
  ["안됀", "안 된", "'되다'의 활용이에요"],
  ["어떻게던", "어떻게든", "고르는 뜻이면 '-든'이에요"],
  ["뭐던지", "뭐든지", "고르는 뜻이면 '-든지'예요"],
  ["무엇이던지", "무엇이든지", "고르는 뜻이면 '-든지'예요"],
  ["누구던지", "누구든지", "고르는 뜻이면 '-든지'예요"],
  ["치뤄", "치러", "'치르다'는 '치러'로 바뀌어요"],
  ["치뤘", "치렀", "'치르다'는 '치렀'으로 바뀌어요"],
  ["잠궈", "잠가", "'잠그다'는 '잠가'로 바뀌어요"],
  ["잠궜", "잠갔", "'잠그다'는 '잠갔'으로 바뀌어요"],
  ["담궈", "담가", "'담그다'는 '담가'로 바뀌어요"],
  ["담궜", "담갔", "'담그다'는 '담갔'으로 바뀌어요"],
  ["설레임", "설렘", "'설레다'의 명사형은 '설렘'이에요"],
  ["헤메", "헤매", "'헤매다'가 맞아요"],
  ["메꿔", "메워", "'메우다'가 표준어예요"],
  ["으례", "으레", "'으레'가 표준어예요"],
  ["넓직", "널찍", "'널찍하다'가 맞아요"],
  ["얇다랗", "얄따랗", "'얄따랗다'가 맞아요"],
  ["삼가해", "삼가", "'삼가다'가 기본형이에요(삼가 주세요)"],
  ["개구장이", "개구쟁이", "'-쟁이'가 맞아요"],
  ["트름", "트림", "'트림'이 표준어예요"],
  ["뇌졸증", "뇌졸중", "'뇌졸중'이 맞아요"],
  ["후회스런", "후회스러운", "'-스럽다'는 '-스러운'으로 바뀌어요"],
  ["안절부절하", "안절부절못하", "'안절부절못하다'가 맞아요"],
  ["오도방정", "오두방정", "'오두방정'이 맞아요"],
  ["건들이", "건드리", "'건드리다'가 맞아요"],
  ["햇님", "해님", "'해님'이 맞아요"],
  ["싯가", "시가", "'시가(時價)'가 맞아요"],
  ["갯수", "개수", "한자어끼리는 사이시옷을 쓰지 않아요"],
  ["홧병", "화병", "한자어끼리는 사이시옷을 쓰지 않아요"],
  ["촛점", "초점", "한자어끼리는 사이시옷을 쓰지 않아요"],
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const RULES: Rule[] = [
  ...WORDS.filter(([a, b, r]) => a !== b && r).map(
    ([wrong, right, reason]): Rule => ({ re: new RegExp(esc(wrong), "g"), fix: () => right, reason, kind: "맞춤법" })
  ),
  // -ㄹ께 → -ㄹ게 (할께, 줄께요)
  {
    re: /([가-힣])께(요)?(?![가-힣])/g,
    fix: (m) => (jong(m[1]) === 8 ? `${m[1]}게${m[2] ?? ""}` : null),
    reason: "약속이나 의지를 나타낼 때는 '-ㄹ게'예요",
    kind: "맞춤법",
  },
  // -ㄹ꺼 → -ㄹ 거 (할꺼야)
  {
    re: /([가-힣])꺼(야|예요|에요|다|지|면|라)?(?![가-힣])/g,
    fix: (m) => (jong(m[1]) === 8 ? `${m[1]} 거${m[2] ?? ""}` : null),
    reason: "'것'의 구어형은 '거'이고, 앞말과 띄어 써요",
    kind: "맞춤법",
  },
  // -지 안- → -지 않-
  {
    re: /([가-힣])지\s?안(아|았|고|는|을|으|다|겠)/g,
    fix: (m) => `${m[1]}지 않${m[2]}`,
    reason: "'-지 아니하-'가 줄면 '않-'이에요",
    kind: "맞춤법",
  },
  // 의존 명사 띄어쓰기: 할수 있다, 할때, 할줄 알다 (앞말이 ㄹ 받침일 때만)
  {
    re: /([가-힣])수(\s?)(있|없)/g,
    fix: (m) => (jong(m[1]) === 8 ? `${m[1]} 수 ${m[3]}` : null),
    reason: "'수'는 앞말과 띄어 쓰고, '있다·없다'와도 띄어 써요",
    kind: "띄어쓰기",
  },
  {
    re: /([가-힣])(때|줄)(?=[\s,.?!…]|[는도면에만까엔의가]|$)/g,
    fix: (m) => (jong(m[1]) === 8 ? `${m[1]} ${m[2]}` : null),
    reason: "'때·줄'은 앞말과 띄어 써요",
    kind: "띄어쓰기",
  },
  { re: /것같(?=[가-힣])/g, fix: () => "것 같", reason: "'것'과 '같다'는 띄어 써요", kind: "띄어쓰기" },
  // 안 + 동사: 안돼, 안되, 안해, 안하
  {
    re: new RegExp(`${B}안(돼|되|해|하|했|할|한)(?!무인|녕|심|정|전|내|건|도|감)`, "g"),
    fix: (m) => `안 ${m[1]}`,
    reason: "부정의 '안'은 뒷말과 띄어 써요",
    kind: "띄어쓰기",
  },
  // 문장부호
  { re: /(?<=\S) {2,}(?=\S)/g, fix: () => " ", reason: "빈칸이 두 번 들어갔어요", kind: "띄어쓰기" },
  { re: /(?<=[가-힣a-zA-Z0-9]) +(?=[.,?!])/g, fix: () => "", reason: "문장부호 앞에는 빈칸을 두지 않아요", kind: "문장부호" },
  { re: /(?<!\.)\.{3,}(?!\.)/g, fix: () => "…", reason: "말줄임표는 '…'로 쓸 수 있어요", kind: "다듬기" },
  { re: /,,+/g, fix: () => ",", reason: "쉼표가 겹쳤어요", kind: "문장부호" },
  { re: /([?!])\1{2,}/g, fix: (m) => m[1], reason: "같은 부호가 여러 번 이어졌어요", kind: "다듬기" },
];
// 같은 말 되풀이: 시에서는 일부러 쓰는 일이 많아 산문에서만 본다
const REPEAT: Rule = { re: /([가-힣]{2,})\s+\1(?![가-힣])/g, fix: (m) => m[1], reason: "같은 말이 두 번 이어졌어요(일부러 쓴 거라면 그대로 두세요)", kind: "오타" };

const PAIRS: [string, string][] = [
  ["「", "」"],
  ["『", "』"],
  ["〈", "〉"],
  ["《", "》"],
  ["(", ")"],
  ["“", "”"],
  ["‘", "’"],
];

// 문단 안에서 짝이 안 맞는 괄호·따옴표
function unbalanced(text: string): Issue[] {
  const out: Issue[] = [];
  let at = 0;
  for (const para of text.split("\n")) {
    for (const [o, c] of PAIRS) {
      const stack: number[] = [];
      for (let i = 0; i < para.length; i++) {
        if (para[i] === o) stack.push(i);
        else if (para[i] === c) {
          if (stack.length) stack.pop();
          else out.push({ from: at + i, to: at + i + 1, original: c, suggestion: c, reason: `여는 '${o}' 없이 닫혔어요`, kind: "문장부호" });
        }
      }
      for (const i of stack) out.push({ from: at + i, to: at + i + 1, original: o, suggestion: o, reason: `'${o}'을(를) 닫는 '${c}'가 없어요`, kind: "문장부호" });
    }
    // 곧은 따옴표는 문단 안에서 짝수여야 한다
    for (const q of ['"', "'"]) {
      const idx = [...para].map((ch, i) => (ch === q ? i : -1)).filter((i) => i >= 0);
      if (idx.length % 2 === 1) {
        const i = idx[idx.length - 1];
        out.push({ from: at + i, to: at + i + 1, original: q, suggestion: q, reason: "따옴표의 짝이 맞지 않아요", kind: "문장부호" });
      }
    }
    at += para.length + 1;
  }
  return out;
}

export function checkSpelling(text: string, { poem = false } = {}): Issue[] {
  const found: Issue[] = [];
  for (const r of poem ? RULES : [...RULES, REPEAT]) {
    r.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.re.exec(text))) {
      if (!m[0]) {
        r.re.lastIndex++;
        continue;
      }
      const s = r.fix(m);
      if (s === null || s === m[0]) continue;
      found.push({ from: m.index, to: m.index + m[0].length, original: m[0], suggestion: s, reason: r.reason, kind: r.kind, source: "rule" });
    }
  }
  found.push(...unbalanced(text).map((x) => ({ ...x, source: "rule" as const })));
  return dedupe(found);
}

// 겹치는 지적은 앞의 것(더 긴 것) 하나만 남긴다
export function dedupe(list: Issue[]) {
  const sorted = [...list].sort((a, b) => a.from - b.from || b.to - a.to);
  const out: Issue[] = [];
  for (const x of sorted) {
    const last = out[out.length - 1];
    if (last && x.from < last.to) continue;
    out.push(x);
  }
  return out;
}

// AI가 돌려준 '원문 조각'을 본문에서 찾아 위치를 붙인다. 앞말(before)이 있으면 그걸로 같은 말 여러 개 중 하나를 고른다
export function locate(text: string, items: { original: string; before?: string; suggestion: string; reason: string; kind?: string }[], base = 0): Issue[] {
  const out: Issue[] = [];
  const used = new Set<number>();
  for (const it of items) {
    if (!it.original || it.original === it.suggestion) continue;
    let pos = -1;
    if (it.before) {
      const k = text.indexOf(it.before + it.original);
      if (k >= 0) pos = k + it.before.length;
    }
    if (pos < 0) {
      let from = 0;
      while ((pos = text.indexOf(it.original, from)) >= 0 && used.has(pos)) from = pos + 1;
    }
    if (pos < 0) continue;
    used.add(pos);
    const kind = (["맞춤법", "띄어쓰기", "문장부호", "오타", "다듬기"] as const).find((k) => k === it.kind) ?? "맞춤법";
    out.push({ from: base + pos, to: base + pos + it.original.length, original: it.original, suggestion: it.suggestion, reason: it.reason, kind, source: "ai" });
  }
  return out;
}
