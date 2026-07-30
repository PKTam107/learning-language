"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayKey, fromDayKey, startOfDay } from "@/lib/streak";
import type { DueCalendarData } from "@/lib/db/insights";

const WEEK_HEAD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Ngưỡng đậm nhạt theo số thẻ tới hạn trong ngày. */
function toneOf(count: number): string {
  if (count === 0) return "bg-white text-slate-400";
  if (count <= 3) return "bg-indigo-50 text-indigo-700";
  if (count <= 10) return "bg-indigo-100 text-indigo-800";
  if (count <= 25) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

/** Thứ trong tuần với Thứ 2 = 0 ... Chủ nhật = 6. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function monthTitle(d: Date): string {
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Lịch ôn tập: mỗi ngày hiện số thẻ **tới hạn** theo lịch nhớ (SM-2 rút gọn).
 * Thẻ chưa học và thẻ quá hạn được gom vào ô hôm nay (đó là việc cần làm ngay).
 * Chạm một ngày để xem những từ nào tới hạn.
 */
export function ReviewCalendar({ due }: { due: DueCalendarData }) {
  const today = startOfDay();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<string | null>(dayKey(today));

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = mondayIndex(first);
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0
    ).getDate();

    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthTotal = useMemo(
    () =>
      cells.reduce(
        (sum, key) => sum + (key ? (due.byDay[key]?.length ?? 0) : 0),
        0
      ),
    [cells, due.byDay]
  );

  const selectedItems = selected ? (due.byDay[selected] ?? []) : [];
  const todayKey = dayKey(today);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5 text-brand" /> Lịch ôn tập
        </h2>
        <p className="text-xs text-slate-400">
          {due.dueNow} thẻ cần ôn ngay · {monthTotal} thẻ trong tháng này
        </p>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-slate-700">
          {monthTitle(cursor)}
        </p>
        <button
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK_HEAD.map((w) => (
          <span key={w} className="pb-1 text-[10px] font-medium text-slate-400">
            {w}
          </span>
        ))}

        {cells.map((key, i) => {
          if (!key) return <span key={`empty-${i}`} />;
          const count = due.byDay[key]?.length ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const past = key < todayKey;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                isSelected
                  ? "border-brand ring-1 ring-brand"
                  : isToday
                    ? "border-brand/40"
                    : "border-slate-100"
              } ${past && count === 0 ? "bg-slate-50 text-slate-300" : toneOf(count)} hover:border-brand/60`}
              title={
                count > 0
                  ? `${count} thẻ tới hạn ngày ${fromDayKey(key).getDate()}/${fromDayKey(key).getMonth() + 1}`
                  : "Không có thẻ tới hạn"
              }
            >
              <span className={isToday ? "font-bold" : "font-medium"}>
                {fromDayKey(key).getDate()}
              </span>
              {count > 0 && (
                <span className="text-[10px] font-semibold leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        {selected === null ? (
          <p className="text-sm text-slate-400">Chọn một ngày để xem chi tiết.</p>
        ) : selectedItems.length === 0 ? (
          <p className="text-sm text-slate-400">
            Ngày {fromDayKey(selected).getDate()}/
            {fromDayKey(selected).getMonth() + 1}: không có thẻ nào tới hạn.
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {selected === todayKey
                ? `Cần ôn hôm nay (${selectedItems.length} thẻ)`
                : `Tới hạn ngày ${fromDayKey(selected).getDate()}/${fromDayKey(selected).getMonth() + 1} (${selectedItems.length} thẻ)`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedItems.slice(0, 12).map((item) => (
                <Link
                  key={item.cardId}
                  href={`/decks/${item.deckId}`}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-700 hover:bg-brand-light hover:text-brand-dark"
                >
                  {item.term}
                </Link>
              ))}
              {selectedItems.length > 12 && (
                <span className="px-1 py-0.5 text-sm text-slate-400">
                  và {selectedItems.length - 12} từ nữa…
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Thẻ chưa học và thẻ quá hạn được gom vào ô hôm nay. Lịch sẽ đổi sau mỗi
        lần bạn đánh giá một thẻ.
      </p>
    </div>
  );
}

/** Tổng số thẻ tới hạn trong `days` ngày tới (gồm hôm nay) — dùng cho tóm tắt. */
export function dueInNextDays(due: DueCalendarData, days: number): number {
  const today = startOfDay();
  let sum = 0;
  for (let i = 0; i < days; i++) {
    sum += due.byDay[dayKey(addDays(today, i))]?.length ?? 0;
  }
  return sum;
}
