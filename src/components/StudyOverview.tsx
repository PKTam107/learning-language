"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlarmClock } from "lucide-react";
import { fetchStudyStats, type StudyStats } from "@/lib/db/stats";
import { useSettings } from "@/lib/settings";
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

  if (!stats) return null;

  const now = new Date();
  const showReminder =
    ready &&
    settings.reminderEnabled &&
    stats.todayCount === 0 &&
    now.getHours() >= settings.reminderHour;

  return (
    <div className="mb-6 space-y-4">
      {showReminder && (
        <Link
          href="/decks"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 transition-colors hover:bg-amber-100"
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
