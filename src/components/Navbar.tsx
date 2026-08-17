"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const router = useRouter();
  const { user } = useSession();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-brand-dark dark:text-indigo-300">
          LinguaCards 🎴
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-indigo-400">
            Trang chủ
          </Link>
          <Link href="/decks" className="text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-indigo-400">
            Bộ thẻ
          </Link>
          <Link href="/weak" className="text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-indigo-400">
            Hay quên
          </Link>
          <Link href="/progress" className="text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-indigo-400">
            Tiến độ
          </Link>
          <Link href="/settings" className="text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-indigo-400">
            Cài đặt
          </Link>
          {/* Filter ngôn ngữ — khóa cứng en→vi ở MVP */}
          <span className="hidden rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 sm:inline">
            🇬🇧 EN → 🇻🇳 VI
          </span>
          <ThemeToggle className="-my-1" />
          {user && (
            <button
              onClick={signOut}
              className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Đăng xuất
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
