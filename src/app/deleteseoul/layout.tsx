import { brush } from "../fonts-brush";
import { serifBold } from "../fonts-game";
import "./deleteseoul.css";

// DELETE SEOUL에서만 쓰는 글꼴(고운바탕, 굵은 명조)과 화면 스타일은 이 주소에서만 불러온다
export default function DeleteSeoulLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${brush.variable} ${serifBold.variable}`} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
