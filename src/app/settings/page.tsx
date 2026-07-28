import { Navbar } from "@/components/Navbar";
import { SettingsForm } from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Cài đặt</h1>
        <SettingsForm />
      </main>
    </>
  );
}
