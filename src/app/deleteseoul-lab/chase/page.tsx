import type { Metadata } from "next";
import ChaseLabClient from "@/explore/v3/ChaseLabClient";
import ChaseTouchOverlay from "@/explore/v3/ChaseTouchOverlay";

export const metadata: Metadata = {
  title: "DELETE SEOUL · CHASE PROTOTYPE",
  robots: { index: false, follow: false },
};

export default function ChaseLabPage() {
  return <><ChaseLabClient /><ChaseTouchOverlay /></>;
}
