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
export default function StudyTodayPage({
  searchParams,
}: {
  searchParams: { quick?: string };
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-8 md:pb-12">
        <StudySession source={{ kind: "due" }} quickStart={searchParams.quick === "1"} />
      </main>
    </>
  );
}
