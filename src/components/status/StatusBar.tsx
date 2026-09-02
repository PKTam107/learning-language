import type { DeckStats } from "@/types";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";

interface StatusBarProps {
  stats: DeckStats;
  /** Hiện chú thích số đếm dưới thanh. */
  showLegend?: boolean;
  className?: string;
}

/** Thanh tiến độ chia màu theo trạng thái + (tùy chọn) chú thích số đếm. */
export function StatusBar({ stats, showLegend = true, className = "" }: StatusBarProps) {
  const { total, byStatus } = stats;

  return (
    <div className={className}>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {total > 0 &&
          STATUS_ORDER.map((s) => {
            const n = byStatus[s];
            if (!n) return null;
            return (
              <div
                key={s}
                className={STATUS_META[s].bar}
                style={{ width: `${(n / total) * 100}%` }}
                title={`${STATUS_META[s].label}: ${n}`}
              />
            );
          })}
      </div>

      {showLegend && (
        /* Lưới 2 cột trên màn hẹp: `flex-wrap` cho 4 nhãn dài không đều nhau
           thì các mục xuống dòng lệch nhau, đọc rất rối. */
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:flex sm:flex-wrap">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="inline-flex min-w-0 items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[s].dot}`} />
              <span className={`truncate ${STATUS_META[s].text}`}>
                {STATUS_META[s].label}
              </span>
              <span className="ml-auto font-semibold text-slate-700 sm:ml-0 dark:text-slate-300">
                {byStatus[s]}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
