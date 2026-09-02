"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Layers,
  BrainCircuit,
  TrendingUp,
  Settings,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeSelect } from "@/components/ThemeToggle";

interface Tab {
  href: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
}

/** Thứ tự điều hướng, dùng chung cho panel mobile và hàng link desktop. */
export const NAV_TABS: Tab[] = [
  { href: "/dashboard", label: "Trang chủ", desc: "Việc cần ôn hôm nay", Icon: Home },
  { href: "/decks", label: "Bộ thẻ", desc: "Quản lý bộ từ vựng", Icon: Layers },
  { href: "/weak", label: "Hay quên", desc: "Từ hay đánh giá “Chưa thuộc”", Icon: BrainCircuit },
  { href: "/progress", label: "Tiến độ", desc: "Huy hiệu, heatmap, lịch ôn", Icon: TrendingUp },
  { href: "/settings", label: "Cài đặt", desc: "Giao diện, phát âm, nhắc học", Icon: Settings },
];

/** Trang đang mở: khớp đúng đường dẫn, hoặc là trang con của nó (/decks/abc). */
export function isActiveTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Điều hướng cho điện thoại: nút ba gạch mở panel trượt từ phải.
 *
 * Panel (thay vì thanh tab đáy) vì mỗi mục cần một dòng mô tả mới rõ nghĩa —
 * "Hay quên" hay "Tiến độ" đứng một mình dưới icon thì khó đoán là gì.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Chỉ portal sau khi mount: document.body chưa có lúc server dựng HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Đổi trang thì đóng panel (bấm một mục là điều hướng luôn).
  useEffect(() => setOpen(false), [pathname]);

  // Mở panel thì chặn cuộn trang bên dưới, và Esc để đóng.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const panel = (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      {/* Nền mờ: chạm ra ngoài để đóng. */}
      <button
        onClick={() => setOpen(false)}
        aria-label="Đóng menu"
        className="absolute inset-0 h-full w-full cursor-default bg-black/40 dark:bg-black/60"
      />

      <div
        className="absolute inset-y-0 right-0 flex w-[min(19rem,82vw)] flex-col bg-white shadow-2xl dark:bg-slate-900"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="truncate font-bold text-brand-dark dark:text-indigo-300">
            LinguaCards 🎴
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
            className="-mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Một vùng cuộn duy nhất cho cả điều hướng và phần cài đặt. Nếu ghim
            cài đặt xuống đáy thì với 5 mục sẽ hở một khoảng trống rất lớn. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav className="p-2">
            <ul>
              {NAV_TABS.map(({ href, label, desc, Icon }) => {
                const active = isActiveTab(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        active
                          ? "bg-brand-light text-brand-dark dark:bg-indigo-500/15 dark:text-indigo-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-brand text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium leading-tight">
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">
                          {desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mx-2 mt-1 border-t border-slate-100 px-2 pb-2 pt-3 dark:border-slate-800">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Giao diện
            </p>
            {/* Bộ chọn 3 nhánh rõ hơn nút xoay vòng khi có đủ chỗ. */}
            <ThemeSelect />
            <button
              onClick={signOut}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Mở menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Portal ra <body>: nút này nằm trong <header> có `backdrop-blur`, mà
          `backdrop-filter` tạo containing block cho con `position: fixed` —
          để nguyên tại chỗ thì `inset-0` hóa ra chỉ bằng hộp header (cao 60px)
          chứ không phải viewport, và panel bị nhốt trong đó. */}
      {mounted && open && createPortal(panel, document.body)}
    </>
  );
}
