import { Navbar } from "@/components/Navbar";
import { QuickCreator } from "@/components/QuickCreator";
import { DecksManager } from "@/components/deck/DecksManager";

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Xin chào 👋</h1>
        <DecksManager showStats />
      </main>
      <QuickCreator />
    </>
  );
}
