import { Navbar } from "@/components/Navbar";
import { TrashList } from "@/components/TrashList";

export default function TrashPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-8 md:pb-12">
        <h1 className="mb-6 text-2xl font-bold">Thùng rác</h1>
        <TrashList />
      </main>
    </>
  );
}
