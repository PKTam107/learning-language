import { Navbar } from "@/components/Navbar";
import { SettingsForm } from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pt-8 md:pb-12">
        <h1 className="mb-6 text-2xl font-bold">Cài đặt</h1>
        <SettingsForm />
      </main>
    </>
  );
}
