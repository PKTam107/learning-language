import { useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { fromDayKey, type DayCount } from "@/lib/streak";
import { colors, radius, spacing } from "@/lib/theme";

/** 5 mức đậm nhạt (0 = không học) — cùng thang indigo với web. */
const LEVEL_COLOR = ["#f1f5f9", "#c7d2fe", "#a5b4fc", "#6366f1", "#4338ca"];

const MONTH_LABEL = [
  "Th1", "Th2", "Th3", "Th4", "Th5", "Th6",
  "Th7", "Th8", "Th9", "Th10", "Th11", "Th12",
];

/** Nhãn hàng: chỉ hiện T2 / T4 / T6 cho gọn (lưới bắt đầu từ Thứ 2). */
const ROW_LABEL = ["T2", "", "T4", "", "T6", "", ""];

const CELL = 11;
const GAP = 3;

function levelOf(count: number, busiest: number): number {
  if (count <= 0) return 0;
  const step = Math.max(1, Math.ceil(busiest / 4));
  return Math.min(4, Math.ceil(count / step));
}

/** Thứ trong tuần với Thứ 2 = 0 ... Chủ nhật = 6. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

interface Props {
  /** Chuỗi ngày liên tiếp (cũ → mới) — từ ActivityStats.heatmap. */
  data: DayCount[];
  busiest: number;
  totalReviews?: number;
  activeDays?: number;
}

/**
 * Heatmap học tập kiểu GitHub Calendar: mỗi cột là 1 tuần (Thứ 2 → Chủ nhật),
 * ô càng đậm = càng nhiều lượt ôn. Cuộn ngang, tự nhảy tới tuần gần nhất.
 */
export function Heatmap({ data, busiest, totalReviews, activeDays }: Props) {
  const scroller = useRef<ScrollView>(null);

  const weeks = useMemo(() => {
    if (data.length === 0) return [] as (DayCount | null)[][];
    const out: (DayCount | null)[][] = [];
    let week: (DayCount | null)[] = Array(
      mondayIndex(fromDayKey(data[0].day))
    ).fill(null);
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

  const monthAt = useMemo(() => {
    const map = new Map<number, string>();
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const first = week.find((d) => d !== null);
      if (!first) return;
      const month = fromDayKey(first.day).getMonth();
      if (month !== lastMonth) {
        map.set(i, MONTH_LABEL[month]);
        lastMonth = month;
      }
    });
    return map;
  }, [weeks]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <CalendarDays size={18} color={colors.brand} />
          <Text style={styles.title}>Lịch học 1 năm</Text>
        </View>
        {(totalReviews !== undefined || activeDays !== undefined) && (
          <Text style={styles.headMeta}>
            {totalReviews !== undefined ? `${totalReviews} lượt ôn` : ""}
            {totalReviews !== undefined && activeDays !== undefined ? " · " : ""}
            {activeDays !== undefined ? `${activeDays} ngày học` : ""}
          </Text>
        )}
      </View>

      {weeks.length === 0 ? (
        <Text style={styles.empty}>
          Chưa có lượt ôn nào. Học một phiên để bắt đầu tô màu lịch nhé!
        </Text>
      ) : (
        <>
          <View style={styles.gridRow}>
            <View style={styles.rowLabels}>
              {ROW_LABEL.map((label, i) => (
                <Text key={i} style={styles.rowLabel}>
                  {label}
                </Text>
              ))}
            </View>

            <ScrollView
              ref={scroller}
              horizontal
              showsHorizontalScrollIndicator={false}
              // Mở ra ở tuần gần nhất (bên phải) như GitHub.
              onContentSizeChange={() =>
                scroller.current?.scrollToEnd({ animated: false })
              }
            >
              <View>
                <View
                  style={[
                    styles.monthRow,
                    { width: weeks.length * (CELL + GAP) },
                  ]}
                >
                  {/* Nhãn tháng đặt tuyệt đối để chữ dài ("Th10") không bị cắt. */}
                  {[...monthAt.entries()].map(([index, text]) => (
                    <Text
                      key={index}
                      style={[styles.monthLabel, { left: index * (CELL + GAP) }]}
                    >
                      {text}
                    </Text>
                  ))}
                </View>
                <View style={styles.weeks}>
                  {weeks.map((week, wi) => (
                    <View key={wi} style={styles.week}>
                      {week.map((day, di) => (
                        <View
                          key={di}
                          style={[
                            styles.cell,
                            {
                              backgroundColor:
                                day === null
                                  ? "transparent"
                                  : LEVEL_COLOR[levelOf(day.count, busiest)],
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          <View style={styles.legend}>
            <Text style={styles.legendText}>Ít</Text>
            {LEVEL_COLOR.map((c) => (
              <View key={c} style={[styles.cell, { backgroundColor: c }]} />
            ))}
            <Text style={styles.legendText}>Nhiều</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  headMeta: { fontSize: 11, color: colors.textSubtle },
  empty: {
    paddingVertical: spacing.lg,
    textAlign: "center",
    fontSize: 13,
    color: colors.textSubtle,
  },
  gridRow: { flexDirection: "row" },
  rowLabels: { paddingTop: 18, marginRight: spacing.xs, gap: GAP },
  rowLabel: {
    height: CELL,
    lineHeight: CELL,
    fontSize: 9,
    color: colors.textSubtle,
  },
  monthRow: { height: 14, marginBottom: 2 },
  monthLabel: {
    position: "absolute",
    top: 0,
    fontSize: 9,
    lineHeight: 14,
    color: colors.textSubtle,
  },
  weeks: { flexDirection: "row", gap: GAP },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 2 },
  legend: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: GAP,
  },
  legendText: { fontSize: 10, color: colors.textSubtle },
});
