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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <StudySession deckId={params.deckId} />
      </main>
    </>
  );
}
