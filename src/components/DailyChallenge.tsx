"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Target } from "lucide-react";
import { fetchChallengeMetrics } from "@/lib/db/insights";
import { useSettings } from "@/lib/settings";
import { buildDailyChallenge, type DailyChallenge as Challenge } from "@/lib/challenge";
import { Spinner } from "@/components/ui/Spinner";

/**
 * "Thử thách hôm nay": 3–4 nhiệm vụ tự sinh theo ngày (ôn N lượt, thêm từ mới,
 * giữ chuỗi...). Tiến độ đọc từ nhật ký ôn + thẻ tạo trong ngày — không bảng mới.
 */
export function DailyChallenge() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const { settings, ready } = useSettings();

  // Mục tiêu "ôn N lượt" co giãn theo số thẻ tới hạn, mà số đó phụ thuộc hạn
  // mức từ mới → chờ cài đặt nạp xong rồi mới tính.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    fetchChallengeMetrics(settings.newPerDay).then((m) => {
      if (alive) setChallenge(buildDailyChallenge(m));
    });
    return () => {
      alive = false;
    };
  }, [ready, settings.newPerDay]);

  return (
    /* min-w-0 là bắt buộc khi thẻ này nằm trong grid: grid item mặc định
    có min-width:auto nên KHÔNG co được xuống dưới min-content, mà bên trong có
    truncate (white-space:nowrap) làm min-content bằng cả chuỗi text → track bị
    nong rộng hơn viewport và cả trang tràn ngang. */
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 shrink-0 text-brand dark:text-indigo-400" />
          <span className="truncate">Thử thách hôm nay</span>
        </h2>
        {challenge && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              challenge.allDone
                ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {challenge.doneCount}/{challenge.quests.length} nhiệm vụ
          </span>
        )}
      </div>

      {!challenge ? (
        <div className="flex justify-center py-8 text-slate-400 dark:text-slate-500">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                challenge.allDone ? "bg-green-500" : "bg-brand"
              }`}
              style={{ width: `${challenge.percent}%` }}
            />
          </div>

          <ul className="space-y-2.5">
            {challenge.quests.map((q) => (
              <li key={q.id} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
                    q.done ? "bg-green-100 dark:bg-green-500/20" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {q.done ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={3} />
                  ) : (
                    q.icon
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      q.done ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {q.title}
                  </p>
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">{q.hint}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    q.done ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {Math.min(q.current, q.target)}/{q.target} {q.unit}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {challenge.allDone
                ? "Xong hết thử thách hôm nay — quá đỉnh! 🎉"
                : "Nhiệm vụ tự đổi mỗi ngày lúc 0h."}
            </p>
            <Link
              href="/study/today"
              className="inline-flex shrink-0 items-center text-sm font-medium text-brand hover:underline dark:text-indigo-400"
            >
              Ôn ngay <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
