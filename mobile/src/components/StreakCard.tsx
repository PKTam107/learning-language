import { StyleSheet, Text, View } from "react-native";
import { Flame } from "lucide-react-native";
import type { StudyStats } from "@/lib/stats";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Thẻ hiển thị chuỗi ngày học (streak) + số từ ôn hôm nay + biểu đồ 7 ngày. */
export function StreakCard({ stats }: { stats: StudyStats }) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const { streak, todayCount, weekCount, series } = stats;
  const active = streak > 0;
  const maxCount = Math.max(1, ...series.map((s) => s.count));

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.streakLeft}>
          <Flame
            size={28}
            color={active ? "#f97316" : colors.textSubtle}
            fill={active ? "#fb923c" : "transparent"}
          />
          <View>
            <Text style={styles.streakValue}>
              {streak} <Text style={styles.streakUnit}>ngày</Text>
            </Text>
            <Text style={styles.streakLabel}>
              {active ? "chuỗi ngày học 🔥" : "bắt đầu chuỗi hôm nay!"}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.rightValue}>{todayCount}</Text>
          <Text style={styles.rightLabel}>hôm nay</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        {series.map((s, i) => {
          const d = new Date(s.day + "T00:00:00");
          const done = s.count > 0;
          const h = 6 + Math.round((s.count / maxCount) * 34);
          return (
            <View key={s.day} style={styles.chartCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: done ? h : 4 },
                    done && styles.barDone,
                    i === series.length - 1 && done && styles.barToday,
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{WEEKDAY[d.getDay()]}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.footer}>Đã ôn {weekCount} lượt trong 7 ngày qua.</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: spacing.md,
    },
    top: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    streakLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    streakValue: { fontSize: 24, fontWeight: "800", color: colors.text },
    streakUnit: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
    streakLabel: { fontSize: 12, color: colors.textMuted },
    right: { alignItems: "flex-end" },
    rightValue: { fontSize: 22, fontWeight: "700", color: colors.brandDark },
    rightLabel: {
      fontSize: 11,
      color: colors.textSubtle,
      textTransform: "uppercase",
    },
    chartRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    chartCol: { flex: 1, alignItems: "center", gap: 4 },
    barTrack: { height: 40, justifyContent: "flex-end" },
    bar: {
      width: 18,
      borderRadius: radius.full,
      backgroundColor: colors.border,
    },
    barDone: { backgroundColor: colors.brand },
    barToday: { backgroundColor: "#f97316" },
    barLabel: { fontSize: 10, color: colors.textSubtle },
    footer: { fontSize: 12, color: colors.textSubtle },
  });
