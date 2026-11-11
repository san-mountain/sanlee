import { brush } from "../fonts-brush";

// 시와 일기의 글꼴(고운바탕)은 이 페이지에서만 불러온다
export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={brush.variable} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
