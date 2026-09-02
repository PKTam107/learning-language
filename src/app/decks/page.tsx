import { Navbar } from "@/components/Navbar";
import { QuickCreator } from "@/components/QuickCreator";
import { DecksManager } from "@/components/deck/DecksManager";

export default function DecksPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-12">
        <DecksManager />
      </main>
      <QuickCreator />
    </>
  );
}
