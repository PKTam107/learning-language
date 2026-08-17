"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  applyTheme,
  loadTheme,
  saveTheme,
  type ThemeChoice,
} from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
  { value: "system", label: "Theo máy", Icon: Monitor },
];

/**
 * Hook đọc/ghi lựa chọn giao diện. `ready` = false cho tới khi đọc xong
 * localStorage ở client — tránh lệch giữa HTML server dựng và lần vẽ đầu.
 */
export function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(loadTheme());
    setReady(true);
  }, []);

  // Đang để "theo máy" thì phải đổi màu ngay khi hệ điều hành đổi.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const change = useCallback((next: ThemeChoice) => {
    setChoice(next);
    saveTheme(next);
    applyTheme(next);
  }, []);

  return { choice, ready, change };
}

/** Nút tròn trên thanh điều hướng: bấm để xoay vòng Sáng → Tối → Theo máy. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { choice, ready, change } = useThemeChoice();
  const current = OPTIONS.find((o) => o.value === choice) ?? OPTIONS[2];
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
  const Icon = current.Icon;

  return (
    <button
      type="button"
      onClick={() => change(next.value)}
      title={`Giao diện: ${current.label} — bấm để chuyển sang ${next.label}`}
      aria-label={`Giao diện: ${current.label}. Bấm để chuyển sang ${next.label}`}
      className={`rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${className}`}
    >
      {/* Trước khi đọc xong localStorage thì giữ chỗ để layout không nhảy. */}
      <Icon className={`h-[18px] w-[18px] ${ready ? "" : "opacity-0"}`} />
    </button>
  );
}

/** Bộ chọn 3 nhánh dùng trong trang Cài đặt. */
export function ThemeSelect() {
  const { choice, ready, change } = useThemeChoice();

  return (
    <div
      role="radiogroup"
      aria-label="Giao diện"
      className="grid grid-cols-3 gap-2"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = ready && choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => change(value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
              active
                ? "border-brand bg-brand-light text-brand-dark dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-200"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
