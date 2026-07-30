import { Navbar } from "@/components/Navbar";
import { ProgressDashboard } from "@/components/ProgressDashboard";

export default function ProgressPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">Tiến độ học</h1>
        <p className="mb-6 text-sm text-slate-500">
          Lịch học cả năm, huy hiệu đã mở và lịch các ngày có thẻ tới hạn.
        </p>
        <ProgressDashboard />
      </main>
    </>
  );
}
