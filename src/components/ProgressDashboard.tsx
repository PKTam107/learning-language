"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Flame, Repeat, Trophy } from "lucide-react";
import { fetchProgressData, type ProgressData } from "@/lib/db/insights";
import { evaluateAchievements, summarize } from "@/lib/achievements";
import { Achievements } from "@/components/Achievements";
import { Heatmap } from "@/components/Heatmap";
import { ReviewCalendar, dueInNextDays } from "@/components/ReviewCalendar";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Trang Tiến độ: nạp **một lần** dữ liệu dùng chung (nhật ký ôn + thẻ + tiến độ)
 * rồi dựng heatmap, huy hiệu và lịch ôn từ cùng bộ dữ liệu đó.
 */
export function ProgressDashboard() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProgressData()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError((e as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không tải được dữ liệu tiến độ: {error}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const { activity, metrics, due } = data;
  const { unlocked, total } = summarize(evaluateAchievements(metrics));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Chuỗi hiện tại"
          value={`${activity.streak} ngày`}
          hint={`Dài nhất: ${activity.bestStreak} ngày`}
        />
        <Tile
          icon={<Repeat className="h-4 w-4 text-brand" />}
          label="Tổng lượt ôn"
          value={metrics.totalReviews}
          hint={`${activity.activeDays} ngày có học`}
        />
        <Tile
          icon={<CalendarCheck className="h-4 w-4 text-amber-600" />}
          label="Cần ôn ngay"
          value={due.dueNow}
          hint={`7 ngày tới: ${dueInNextDays(due, 7)} thẻ`}
        />
        <Tile
          icon={<Trophy className="h-4 w-4 text-amber-500" />}
          label="Huy hiệu"
          value={`${unlocked}/${total}`}
          hint={`${metrics.masteredCards}/${metrics.totalCards} từ đã thuộc`}
        />
      </div>

      <Heatmap
        data={activity.heatmap}
        busiest={activity.busiest}
        totalReviews={metrics.totalReviews}
        activeDays={activity.activeDays}
      />

      <Achievements metrics={metrics} />

      <ReviewCalendar due={due} />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
