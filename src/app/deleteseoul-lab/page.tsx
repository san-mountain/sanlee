import type { Metadata } from "next";
import ExploreV2Client from "@/explore/v2/ExploreV2Client";

// Unlisted 3D story prototype. Production /deleteseoul remains unchanged.
export const metadata: Metadata = {
  title: "DELETE SEOUL · 3D STORY LAB",
  description: "DELETE SEOUL 3D story prototype",
  robots: { index: false, follow: false },
};

export default function DeleteSeoulLabPage() {
  return <ExploreV2Client />;
}
