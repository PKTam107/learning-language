"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
import { fetchGoalProgress } from "@/lib/db/goals";
import type { GoalProgress } from "@/lib/goals";

export function LearningGoal() {
  const { settings, ready } = useSettings();
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setError(false);
    fetchGoalProgress({ dailyGoal: settings.dailyGoal, weeklyDays: settings.weeklyDays })
      .then((data) => { if (alive) setProgress(data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [ready, settings.dailyGoal, settings.weeklyDays]);
  return <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-semibold">Mục tiêu của bạn</h2><Link href="/settings" className="text-sm text-brand dark:text-indigo-300">Điều chỉnh</Link></div>
    {error ? <p className="text-sm text-slate-500">Chưa tải được tiến độ mục tiêu. Bạn vẫn có thể bắt đầu học.</p> : !progress ? <p className="text-sm text-slate-500">Đang tải tiến độ…</p> : <>
      <p className="text-sm">Hôm nay: <strong>{progress.todayWords}/{progress.dailyTarget} từ</strong>{progress.dailyDone ? " · Hoàn thành! 🎉" : progress.dailyTarget ? ` · Còn ${Math.max(0, progress.dailyTarget - progress.todayWords)} từ nữa` : " · Thêm từ đầu tiên để bắt đầu"}</p>
      <progress aria-label="Mục tiêu ôn từ hôm nay" value={Math.min(progress.todayWords, progress.dailyTarget)} max={progress.dailyTarget || 1} className="my-2 h-2 w-full accent-indigo-600" />
      <p className="text-sm text-slate-500 dark:text-slate-400">Tuần này: <strong>{progress.weekDays}/{progress.weeklyTarget} ngày có học</strong>{progress.weeklyDone ? " · Đạt mục tiêu tuần!" : " · Thứ Hai–Chủ nhật"}</p>
      <p className="mt-2 text-xs text-slate-500">Mỗi từ ôn chỉ đếm một lần/ngày. Tuần tính các ngày có ôn thẻ; bạn có thể nghỉ xen kẽ.</p>
    </>}
  </section>;
}
