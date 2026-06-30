import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          LinguaCards 🎴
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Gõ một từ tiếng Anh — nhận ngay flashcard đầy đủ phiên âm, nghĩa, ví dụ
          và phát âm. Học và ôn tập mọi lúc, trên mọi thiết bị.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        {[
          { t: "Tự sinh thẻ", d: "Tra từ tự động, điền sẵn mọi thông tin." },
          { t: "Lật & đánh giá", d: "Học theo kiểu Anki, đánh dấu mức thuộc." },
          { t: "Đồng bộ", d: "Đăng nhập Google, không lo mất dữ liệu." },
        ].map((f) => (
          <div key={f.t} className="rounded-xl border border-slate-200 bg-white p-5 text-left">
            <h3 className="font-semibold text-brand-dark">{f.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.d}</p>
          </div>
        ))}
      </div>

      <Link
        href="/login"
        className="rounded-lg bg-brand px-8 py-3 text-base font-medium text-white hover:bg-brand-dark"
      >
        Bắt đầu học ngay
      </Link>
    </main>
  );
}
