import { Navbar } from "@/components/Navbar";
import { DeckDetail } from "@/components/deck/DeckDetail";

export default function DeckDetailPage({
  params,
}: {
  params: { deckId: string };
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <DeckDetail deckId={params.deckId} />
      </main>
    </>
  );
}
