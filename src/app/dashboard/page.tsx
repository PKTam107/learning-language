import { Navbar } from "@/components/Navbar";
import { QuickCreator } from "@/components/QuickCreator";
import { DecksManager } from "@/components/deck/DecksManager";
import { Hand } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          Xin chào <Hand className="h-6 w-6 text-amber-500" />
        </h1>
        <DecksManager showStats />
      </main>
      <QuickCreator />
    </>
  );
}
