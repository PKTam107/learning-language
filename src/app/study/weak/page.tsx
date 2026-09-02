import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { StudySession } from "@/components/flashcard/StudySession";

export const metadata: Metadata = { title: "Ôn từ hay quên" };

/** Phiên ôn đúng những từ bị đánh giá "Chưa thuộc" nhiều nhất. */
export default function StudyWeakPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-8 md:pb-12">
        <StudySession source={{ kind: "weak" }} />
      </main>
    </>
  );
}
