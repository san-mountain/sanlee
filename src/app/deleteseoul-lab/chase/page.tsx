import type { Metadata } from "next";
import ChaseLabClient from "@/explore/v3/ChaseLabClient";

export const metadata: Metadata = {
  title: "DELETE SEOUL · CHASE PROTOTYPE",
  robots: { index: false, follow: false },
};

export default function ChaseLabPage() {
  return <ChaseLabClient />;
}
