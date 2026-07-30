import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react-native";
import { addDays, dayKey, fromDayKey, startOfDay } from "@/lib/streak";
import type { DueCalendarData } from "@/lib/insights";
import { colors, radius, spacing } from "@/lib/theme";

const WEEK_HEAD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Nền/chữ theo số thẻ tới hạn trong ngày. */
function toneOf(count: number): { bg: string; fg: string } {
  if (count === 0) return { bg: colors.card, fg: colors.textSubtle };
  if (count <= 3) return { bg: "#eef2ff", fg: "#4338ca" };
  if (count <= 10) return { bg: "#e0e7ff", fg: "#3730a3" };
  if (count <= 25) return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#ffe4e6", fg: "#9f1239" };
}

/** Thứ trong tuần với Thứ 2 = 0 ... Chủ nhật = 6. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Lịch ôn tập: mỗi ngày hiện số thẻ **tới hạn** theo lịch nhớ.
 * Thẻ chưa học và thẻ quá hạn gom vào ô hôm nay. Chạm một ngày để xem từ nào tới hạn.
 */
export function ReviewCalendar({ due }: { due: DueCalendarData }) {
  const router = useRouter();
  const today = startOfDay();
  const todayKey = dayKey(today);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<string>(todayKey);

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

  const items = due.byDay[selected] ?? [];
  const selectedDate = fromDayKey(selected);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <CalendarClock size={18} color={colors.brand} />
          <Text style={styles.title}>Lịch ôn tập</Text>
        </View>
        <Text style={styles.headMeta}>
          {due.dueNow} cần ôn ngay · {monthTotal} trong tháng
        </Text>
      </View>

      <View style={styles.monthBar}>
        <Pressable
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          hitSlop={8}
          accessibilityLabel="Tháng trước"
        >
          <ChevronLeft size={18} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.monthText}>
          Tháng {cursor.getMonth() + 1}/{cursor.getFullYear()}
        </Text>
        <Pressable
          onPress={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          hitSlop={8}
          accessibilityLabel="Tháng sau"
        >
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEK_HEAD.map((w) => (
          <View key={w} style={styles.cellWrap}>
            <Text style={styles.weekHead}>{w}</Text>
          </View>
        ))}

        {cells.map((key, i) => {
          if (!key) return <View key={`empty-${i}`} style={styles.cellWrap} />;
          const count = due.byDay[key]?.length ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const past = key < todayKey;
          const tone = past && count === 0
            ? { bg: "#f8fafc", fg: "#cbd5e1" }
            : toneOf(count);
          return (
            <View key={key} style={styles.cellWrap}>
              <Pressable
                onPress={() => setSelected(key)}
                style={[
                  styles.day,
                  { backgroundColor: tone.bg },
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: tone.fg },
                    isToday && styles.dayNumToday,
                  ]}
                >
                  {fromDayKey(key).getDate()}
                </Text>
                {count > 0 && (
                  <Text style={[styles.dayCount, { color: tone.fg }]}>{count}</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.detail}>
        {items.length === 0 ? (
          <Text style={styles.detailEmpty}>
            Ngày {selectedDate.getDate()}/{selectedDate.getMonth() + 1}: không có
            thẻ nào tới hạn.
          </Text>
        ) : (
          <>
            <Text style={styles.detailTitle}>
              {selected === todayKey
                ? `Cần ôn hôm nay (${items.length} thẻ)`
                : `Tới hạn ${selectedDate.getDate()}/${selectedDate.getMonth() + 1} (${items.length} thẻ)`}
            </Text>
            <View style={styles.chips}>
              {items.slice(0, 12).map((item) => (
                <Pressable
                  key={item.cardId}
                  onPress={() => router.push(`/decks/${item.deckId}`)}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                >
                  <Text style={styles.chipText}>{item.term}</Text>
                </Pressable>
              ))}
              {items.length > 12 && (
                <Text style={styles.more}>và {items.length - 12} từ nữa…</Text>
              )}
            </View>
          </>
        )}
      </View>

      <Text style={styles.footer}>
        Thẻ chưa học và thẻ quá hạn được gom vào ô hôm nay.
      </Text>
    </View>
  );
}

/** Tổng số thẻ tới hạn trong `days` ngày tới (gồm hôm nay). */
export function dueInNextDays(due: DueCalendarData, days: number): number {
  const today = startOfDay();
  let sum = 0;
  for (let i = 0; i < days; i++) {
    sum += due.byDay[dayKey(addDays(today, i))]?.length ?? 0;
  }
  return sum;
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  headMeta: { fontSize: 11, color: colors.textSubtle },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  monthText: { fontSize: 14, fontWeight: "600", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  weekHead: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSubtle,
    paddingBottom: 2,
  },
  day: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  dayToday: { borderColor: colors.brand },
  daySelected: { borderColor: colors.brand, borderWidth: 2 },
  dayNum: { fontSize: 12, fontWeight: "600" },
  dayNumToday: { fontWeight: "800" },
  dayCount: { fontSize: 10, fontWeight: "700" },
  detail: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailEmpty: { fontSize: 13, color: colors.textSubtle },
  detailTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "#f1f5f9",
  },
  chipPressed: { backgroundColor: colors.brandLight },
  chipText: { fontSize: 13, color: colors.text },
  more: { fontSize: 13, color: colors.textSubtle, paddingVertical: 3 },
  footer: { marginTop: spacing.sm, fontSize: 11, color: colors.textSubtle },
});
