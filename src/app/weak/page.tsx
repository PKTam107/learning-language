import { Navbar } from "@/components/Navbar";
import { WeakWords } from "@/components/WeakWords";

export default function WeakPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">Bạn hay quên</h1>
        <p className="mb-6 text-sm text-slate-500">
          Những từ bạn đánh giá <strong>Chưa thuộc</strong> nhiều nhất — nên ưu
          tiên ôn lại.
        </p>
        <WeakWords />
      </main>
    </>
  );
}
