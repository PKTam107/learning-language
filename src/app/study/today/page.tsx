import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { StudySession } from "@/components/flashcard/StudySession";

export const metadata: Metadata = { title: "Ôn hôm nay" };

/**
 * Phiên ôn gộp **mọi bộ thẻ**: tất cả thẻ đến hạn hôm nay trong một lần học.
 *
 * Segment tĩnh `today` được Next ưu tiên hơn segment động `[deckId]` cùng cấp,
 * và deckId thật luôn là UUID nên không bao giờ đụng nhau.
 */
export default function StudyTodayPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 md:pb-12">
        <StudySession source={{ kind: "due" }} />
      </main>
    </>
  );
}
