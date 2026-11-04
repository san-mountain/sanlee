import type { Metadata } from "next";
import EraseOutside from "@/explore/v2/EraseOutside";

export const metadata: Metadata = {
  title: "DELETE SEOUL · OUTSIDE THE WORLD",
  robots: { index: false, follow: false },
};

export default function DeleteSeoulErasePage() {
  return <EraseOutside />;
}
