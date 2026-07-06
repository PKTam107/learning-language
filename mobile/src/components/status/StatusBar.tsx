import { StyleSheet, Text, View } from "react-native";
import type { DeckStats } from "@/types";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { colors, radius, spacing } from "@/lib/theme";

/** Thanh tiến độ chia màu theo trạng thái + (tùy chọn) chú thích số đếm. */
export function StatusBar({
  stats,
  showLegend = true,
}: {
  stats: DeckStats;
  showLegend?: boolean;
}) {
  const { total, byStatus } = stats;
  return (
    <View>
      <View style={styles.track}>
        {total > 0 &&
          STATUS_ORDER.map((s) => {
            const n = byStatus[s];
            if (!n) return null;
            return (
              <View
                key={s}
                style={{ flex: n, backgroundColor: STATUS_META[s].color }}
              />
            );
          })}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {STATUS_ORDER.map((s) => (
            <View key={s} style={styles.item}>
              <View
                style={[styles.dot, { backgroundColor: STATUS_META[s].color }]}
              />
              <Text style={styles.label}>{STATUS_META[s].label}</Text>
              <Text style={styles.count}>{byStatus[s]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  legend: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, color: colors.textMuted },
  count: { fontSize: 12, fontWeight: "700", color: colors.text },
});
