import { Navbar } from "@/components/Navbar";
import { QuickCreator } from "@/components/QuickCreator";
import { DecksManager } from "@/components/deck/DecksManager";

export default function DecksPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <DecksManager />
      </main>
      <QuickCreator />
    </>
  );
}
