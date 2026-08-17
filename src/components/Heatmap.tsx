"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { fromDayKey, type DayCount } from "@/lib/streak";

/**
 * 5 mức đậm nhạt (0 = không học) — cùng thang màu với brand.
 * Nền tối phải **đảo chiều thang**: ở nền sáng "nhiều lượt ôn" = màu đậm dần,
 * còn trên nền tối thì đậm lại thành chìm — nên mức cao dùng indigo sáng dần.
 */
const LEVEL_CLASS = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-indigo-200 dark:bg-indigo-900",
  "bg-indigo-300 dark:bg-indigo-700",
  "bg-indigo-500 dark:bg-indigo-500",
  "bg-indigo-700 dark:bg-indigo-300",
];

const MONTH_LABEL = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

/** Nhãn hàng: chỉ hiện T2 / T4 / T6 cho gọn (lưới bắt đầu từ Thứ 2). */
const ROW_LABEL = ["T2", "", "T4", "", "T6", "", ""];

/** Mức đậm của một ngày, chia theo ngày ôn nhiều nhất trong kỳ. */
function levelOf(count: number, busiest: number): number {
  if (count <= 0) return 0;
  const step = Math.max(1, Math.ceil(busiest / 4));
  return Math.min(4, Math.ceil(count / step));
}

/** Thứ trong tuần với Thứ 2 = 0 ... Chủ nhật = 6. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function formatDay(key: string): string {
  const d = fromDayKey(key);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

interface Props {
  /** Chuỗi ngày liên tiếp (cũ → mới) — từ ActivityStats.heatmap. */
  data: DayCount[];
  /** Số lượt ôn nhiều nhất trong 1 ngày (chia mức đậm nhạt). */
  busiest: number;
  /** Tổng lượt ôn + số ngày có học, hiện ở tiêu đề. */
  totalReviews?: number;
  activeDays?: number;
}

/**
 * Heatmap học tập kiểu GitHub Calendar: mỗi cột là 1 tuần (Thứ 2 → Chủ nhật),
 * ô càng đậm = càng nhiều lượt ôn trong ngày. Dữ liệu từ review_events.
 */
export function Heatmap({ data, busiest, totalReviews, activeDays }: Props) {
  // Chia thành các tuần; tuần đầu được đệm ô trống cho khớp thứ.
  const weeks = useMemo(() => {
    if (data.length === 0) return [] as (DayCount | null)[][];
    const out: (DayCount | null)[][] = [];
    let week: (DayCount | null)[] = Array(mondayIndex(fromDayKey(data[0].day))).fill(
      null
    );
    for (const day of data) {
      week.push(day);
      if (week.length === 7) {
        out.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      out.push(week);
    }
    return out;
  }, [data]);

  // Nhãn tháng: đặt ở cột đầu tiên của mỗi tháng mới.
  const monthLabels = useMemo(() => {
    const labels: { index: number; text: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const first = week.find((d) => d !== null);
      if (!first) return;
      const month = fromDayKey(first.day).getMonth();
      if (month !== lastMonth) {
        labels.push({ index: i, text: MONTH_LABEL[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  if (weeks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <Header totalReviews={totalReviews} activeDays={activeDays} />
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          Chưa có lượt ôn nào. Học một phiên để bắt đầu tô màu lịch nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <Header totalReviews={totalReviews} activeDays={activeDays} />

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-1">
          {/* Cột nhãn thứ */}
          <div className="mr-1 flex flex-col gap-[3px] pt-[18px]">
            {ROW_LABEL.map((label, i) => (
              <span
                key={i}
                className="h-[11px] text-[9px] leading-[11px] text-slate-400 dark:text-slate-500"
              >
                {label}
              </span>
            ))}
          </div>

          <div>
            {/* Hàng nhãn tháng — dùng grid theo số tuần để nhãn khớp cột */}
            <div
              className="mb-1 grid h-[14px] gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, 11px)`,
              }}
            >
              {weeks.map((_, i) => {
                const label = monthLabels.find((m) => m.index === i);
                return (
                  <span
                    key={i}
                    className="whitespace-nowrap text-[9px] leading-[14px] text-slate-400 dark:text-slate-500"
                  >
                    {label?.text ?? ""}
                  </span>
                );
              })}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) =>
                    day === null ? (
                      <span key={di} className="h-[11px] w-[11px]" />
                    ) : (
                      <span
                        key={di}
                        className={`h-[11px] w-[11px] rounded-[2px] ${
                          LEVEL_CLASS[levelOf(day.count, busiest)]
                        }`}
                        title={
                          day.count > 0
                            ? `${day.count} lượt ôn · ${formatDay(day.day)}`
                            : `Không ôn · ${formatDay(day.day)}`
                        }
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <span>Ít</span>
        {LEVEL_CLASS.map((cls) => (
          <span key={cls} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  );
}

function Header({
  totalReviews,
  activeDays,
}: {
  totalReviews?: number;
  activeDays?: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarDays className="h-5 w-5 text-brand dark:text-indigo-400" /> Lịch học 1 năm
      </h2>
      {(totalReviews !== undefined || activeDays !== undefined) && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {totalReviews !== undefined && <>{totalReviews} lượt ôn</>}
          {totalReviews !== undefined && activeDays !== undefined && " · "}
          {activeDays !== undefined && <>{activeDays} ngày có học</>}
        </p>
      )}
    </div>
  );
}
