"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlarmClock } from "lucide-react";
import { fetchStudyStats, type StudyStats } from "@/lib/db/stats";
import { useSettings } from "@/lib/settings";
import { minutesOfDay } from "@/lib/reminder";
import { Skeleton } from "@/components/ui/Skeleton";
import { StreakCard } from "./StreakCard";

/**
 * Khối tổng quan học tập trên dashboard: banner nhắc học (khi tới giờ & hôm nay
 * chưa ôn) + thẻ chuỗi ngày học. Tự nạp thống kê từ review_events.
 */
export function StudyOverview() {
  const { settings, ready } = useSettings();
  const [stats, setStats] = useState<StudyStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetchStudyStats().then((s) => {
      if (alive) setStats(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Giữ chỗ đúng chiều cao thẻ streak để phần dưới không bị đẩy xuống khi số về.
  if (!stats)
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="mt-1.5 h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-9 w-12" />
        </div>
        <Skeleton className="mt-4 h-14 w-full" />
        <Skeleton className="mt-3 h-3 w-48" />
      </div>
    );

  const now = new Date();
  const showReminder =
    ready &&
    settings.reminderEnabled &&
    stats.todayCount === 0 &&
    minutesOfDay(now.getHours(), now.getMinutes()) >=
      minutesOfDay(settings.reminderHour, settings.reminderMinute);

  return (
    <div className="mb-6 space-y-4">
      {showReminder && (
        <Link
          href="/decks"
          className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200 transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/20"
        >
          <AlarmClock className="h-5 w-5 shrink-0 text-amber-500" />
          <span className="text-sm font-medium">
            Đến giờ ôn từ rồi! Ôn vài từ để giữ chuỗi ngày học 🔥
          </span>
        </Link>
      )}
      <StreakCard stats={stats} />
    </div>
  );
}
