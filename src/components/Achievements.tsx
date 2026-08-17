"use client";

import { Trophy } from "lucide-react";
import {
  evaluateAchievements,
  groupProgress,
  summarize,
  type Achievement,
  type AchievementMetrics,
} from "@/lib/achievements";

/** Màu viền/nền theo bậc mốc trong nhóm (thấp → cao). */
const TIER_CLASS = [
  "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10",
  "border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10",
  "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10",
  "border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10",
  "border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10",
];

/**
 * Huy hiệu: mốc theo số thẻ, số từ đã thuộc, chuỗi ngày học, lượt ôn và số ngày
 * có học. Mốc đã đạt hiện màu, chưa đạt hiện xám kèm tiến độ.
 * `compact` = chỉ hiện tổng quan + mốc sắp đạt (dùng cho trang chủ).
 */
export function Achievements({
  metrics,
  compact,
}: {
  metrics: AchievementMetrics;
  compact?: boolean;
}) {
  const list = evaluateAchievements(metrics);
  const { unlocked, total, next } = summarize(list);
  const groups = groupProgress(list);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-amber-500" /> Huy hiệu
        </h2>
        <span className="rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          {unlocked}/{total} đã mở
        </span>
      </div>

      {next && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
          <span className="text-xl grayscale">{next.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Sắp đạt: {next.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {next.detail} — còn {next.remaining}
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-brand dark:text-indigo-400">
            {next.percent}%
          </span>
        </div>
      )}

      {compact ? (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.group} className="flex items-center gap-3">
              <span className="text-lg">{g.earned?.icon ?? "🔒"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{g.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {g.current} {g.unit}
                  {g.next ? ` · mốc sau ${g.next.goal}` : " · đã đạt hết mốc"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {g.unlockedCount}/{g.totalCount}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((a) => (
            <Badge key={a.id} item={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ item }: { item: Achievement }) {
  const tone = item.unlocked
    ? TIER_CLASS[Math.min(item.tier, TIER_CLASS.length) - 1]
    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800";

  return (
    <div
      className={`flex flex-col rounded-xl border p-3 ${tone}`}
      title={item.detail}
    >
      <div className="flex items-start gap-2">
        <span className={`text-2xl ${item.unlocked ? "" : "opacity-40 grayscale"}`}>
          {item.icon}
        </span>
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold ${
              item.unlocked ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {item.title}
          </p>
          <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{item.detail}</p>
        </div>
      </div>

      {item.unlocked ? (
        <p className="mt-2 text-[11px] font-semibold text-green-600 dark:text-green-400">Đã mở ✓</p>
      ) : (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${item.percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {item.current}/{item.goal}
          </p>
        </div>
      )}
    </div>
  );
}
