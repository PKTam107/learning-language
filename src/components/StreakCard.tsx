"use client";

import { Flame } from "lucide-react";
import type { StudyStats } from "@/lib/db/stats";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Thẻ hiển thị chuỗi ngày học (streak) + số lượt ôn hôm nay + biểu đồ 7 ngày. */
export function StreakCard({ stats }: { stats: StudyStats }) {
  const { streak, todayCount, weekCount, series } = stats;
  const active = streak > 0;
  const maxCount = Math.max(1, ...series.map((s) => s.count));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame
            className="h-7 w-7"
            style={{ color: active ? "#f97316" : "#cbd5e1" }}
            fill={active ? "#fb923c" : "transparent"}
          />
          <div>
            <p className="text-2xl font-extrabold text-slate-900">
              {streak}{" "}
              <span className="text-base font-semibold text-slate-500">
                ngày
              </span>
            </p>
            <p className="text-xs text-slate-500">
              {active ? "chuỗi ngày học 🔥" : "bắt đầu chuỗi hôm nay!"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-brand-dark">{todayCount}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            hôm nay
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-1">
        {series.map((s, i) => {
          const d = new Date(s.day + "T00:00:00");
          const done = s.count > 0;
          const h = 6 + Math.round((s.count / maxCount) * 34);
          const isToday = i === series.length - 1;
          return (
            <div key={s.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-10 items-end">
                <div
                  className={`w-4 rounded-full ${
                    done
                      ? isToday
                        ? "bg-orange-500"
                        : "bg-brand"
                      : "bg-slate-200"
                  }`}
                  style={{ height: done ? h : 4 }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {WEEKDAY[d.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Đã ôn {weekCount} lượt trong 7 ngày qua.
      </p>
    </div>
  );
}
