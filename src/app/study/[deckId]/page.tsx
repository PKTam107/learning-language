import { Navbar } from "@/components/Navbar";
import { StudySession } from "@/components/flashcard/StudySession";

export default function StudyPage({
  params,
}: {
  params: { deckId: string };
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-8 md:pb-12">
        <StudySession source={{ kind: "deck", deckId: params.deckId }} />
      </main>
    </>
  );
}
