"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlarmClock, GraduationCap, PartyPopper } from "lucide-react";
import { fetchDueCount, fetchStudyStats, type StudyStats } from "@/lib/db/stats";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/lib/settings";
import { minutesOfDay } from "@/lib/reminder";
import { Skeleton } from "@/components/ui/Skeleton";
import { StreakCard } from "./StreakCard";

/**
 * Khối "Hôm nay" trên trang chủ: banner nhắc học (khi tới giờ & hôm nay chưa
 * ôn) + **hành động chính** (ôn số thẻ đến hạn, gộp mọi bộ thẻ) + thẻ chuỗi
 * ngày học.
 *
 * Nút ôn đặt ở đây, trên cùng trang chủ, vì đó là việc người dùng cần làm mỗi
 * ngày — trước đây phải cuộn xuống lưới bộ thẻ và tự đoán bộ nào có thẻ đến hạn.
 */
export function StudyOverview() {
  const { settings, ready } = useSettings();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchStudyStats().then((s) => {
      if (alive) setStats(s);
    });
    fetchDueCount().then((n) => {
      if (alive) setDue(n);
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
          href="/study/today"
          className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200 transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/20"
        >
          <AlarmClock className="h-5 w-5 shrink-0 text-amber-500" />
          <span className="text-sm font-medium">
            Đến giờ ôn từ rồi! Ôn vài từ để giữ chuỗi ngày học 🔥
          </span>
        </Link>
      )}
      {/* Hành động chính của ngày. `due === null` là còn đang đếm → chưa vẽ. */}
      {due !== null &&
        (due > 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-gradient-to-br from-brand-light to-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-500/30 dark:from-indigo-500/15 dark:to-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/30">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {due} từ cần ôn hôm nay
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gộp tất cả bộ thẻ vào một phiên.
                </p>
              </div>
            </div>
            <Link href="/study/today" className="shrink-0">
              <Button size="lg" className="w-full sm:w-auto">
                Ôn ngay
              </Button>
            </Link>
          </div>
        ) : (
          stats.todayCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
              <PartyPopper className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">
                Xong hết thẻ đến hạn hôm nay. Nghỉ ngơi thôi!
              </span>
            </div>
          )
        ))}

      <StreakCard stats={stats} />
    </div>
  );
}
