import { Navbar } from "@/components/Navbar";
import { ProgressDashboard } from "@/components/ProgressDashboard";

export default function ProgressPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-12">
        <h1 className="mb-2 text-2xl font-bold">Tiến độ học</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Lịch học cả năm, huy hiệu đã mở và lịch các ngày có thẻ tới hạn.
        </p>
        <ProgressDashboard />
      </main>
    </>
  );
}
