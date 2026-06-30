"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";

export function Navbar() {
  const router = useRouter();
  const { user } = useSession();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-brand-dark">
          LinguaCards 🎴
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-slate-600 hover:text-brand">
            Trang chủ
          </Link>
          <Link href="/decks" className="text-slate-600 hover:text-brand">
            Bộ thẻ
          </Link>
          {/* Filter ngôn ngữ — khóa cứng en→vi ở MVP */}
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 sm:inline">
            🇬🇧 EN → 🇻🇳 VI
          </span>
          {user && (
            <button
              onClick={signOut}
              className="text-slate-500 hover:text-red-600"
            >
              Đăng xuất
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
