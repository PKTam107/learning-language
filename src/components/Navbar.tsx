"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNav, NAV_TABS, isActiveTab } from "@/components/BottomNav";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSession();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/dashboard"
            className="shrink-0 text-lg font-bold text-brand-dark dark:text-indigo-300"
          >
            LinguaCards 🎴
          </Link>

          {/* Điện thoại dùng thanh tab dưới đáy (BottomNav) nên ẩn hàng link ở đây. */}
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {NAV_TABS.map(({ href, label }) => {
              const active = isActiveTab(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                    active
                      ? "bg-brand-light font-medium text-brand-dark dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-brand dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            {/* Filter ngôn ngữ — khóa cứng en→vi ở MVP */}
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 lg:inline dark:bg-slate-800 dark:text-slate-400">
              🇬🇧 EN → 🇻🇳 VI
            </span>
            <ThemeToggle className="-my-1" />
            {user && (
              <button
                onClick={signOut}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <BottomNav />
    </>
  );
}
