"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Layers,
  BrainCircuit,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface Tab {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Thứ tự tab cố định — cũng dùng lại cho hàng link ở Navbar (desktop). */
export const NAV_TABS: Tab[] = [
  { href: "/dashboard", label: "Trang chủ", Icon: Home },
  { href: "/decks", label: "Bộ thẻ", Icon: Layers },
  { href: "/weak", label: "Hay quên", Icon: BrainCircuit },
  { href: "/progress", label: "Tiến độ", Icon: TrendingUp },
  { href: "/settings", label: "Cài đặt", Icon: Settings },
];

/** Tab đang mở: khớp đúng đường dẫn, hoặc là trang con của nó (/decks/abc). */
export function isActiveTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Thanh tab dưới đáy màn hình — chỉ hiện trên điện thoại (dưới `md`).
 * Trên desktop điều hướng vẫn nằm ở Navbar. Thanh này đệm thêm safe-area để
 * không bị vạch home của iPhone che mất.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Điều hướng chính"
    >
      <ul className="mx-auto flex max-w-lg">
        {NAV_TABS.map(({ href, label, Icon }) => {
          const active = isActiveTab(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-brand dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {/* Nền bo tròn quanh icon để tab đang mở nổi rõ khi liếc nhanh. */}
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-light dark:bg-indigo-500/15" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
