import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

/** Màu badge theo cấp CEFR (dễ → khó: xanh → cam → tím). */
const CEFR_COLOR: Record<string, { bg: string; fg: string }> = {
  A1: { bg: "#d1fae5", fg: "#047857" },
  A2: { bg: "#dcfce7", fg: "#15803d" },
  B1: { bg: "#fef3c7", fg: "#b45309" },
  B2: { bg: "#ffedd5", fg: "#c2410c" },
  C1: { bg: "#ffe4e6", fg: "#be123c" },
  C2: { bg: "#f3e8ff", fg: "#7e22ce" },
};

/** Badge cấp độ CEFR (A1..C2). Ẩn nếu không có. */
export function CefrBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  const c = CEFR_COLOR[level] ?? { bg: colors.bg, fg: colors.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{level}</Text>
    </View>
  );
}

/** Khối họ từ (word family) + collocations. Ẩn phần nào rỗng. */
export function EnrichmentSections({
  wordFamily,
  collocations,
}: {
  wordFamily?: string[] | null;
  collocations?: string[] | null;
}) {
  const hasFamily = !!wordFamily && wordFamily.length > 0;
  const hasColloc = !!collocations && collocations.length > 0;
  if (!hasFamily && !hasColloc) return null;

  return (
    <View style={styles.wrap}>
      {hasFamily && (
        <View style={styles.section}>
          <Text style={styles.label}>HỌ TỪ</Text>
          <View style={styles.chips}>
            {wordFamily!.map((w) => (
              <View key={w} style={[styles.chip, styles.chipFamily]}>
                <Text style={styles.chipFamilyText}>{w}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {hasColloc && (
        <View style={styles.section}>
          <Text style={styles.label}>KẾT HỢP TỪ</Text>
          <View style={styles.chips}>
            {collocations!.map((c) => (
              <View key={c} style={[styles.chip, styles.chipColloc]}>
                <Text style={styles.chipCollocText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  badgeText: { fontSize: 12, fontWeight: "800" },
  wrap: { gap: spacing.md },
  section: { gap: spacing.xs },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSubtle,
    letterSpacing: 0.5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  chipFamily: { backgroundColor: "#eef2ff" },
  chipFamilyText: { fontSize: 14, color: "#4338ca" },
  chipColloc: { backgroundColor: "#ccfbf1" },
  chipCollocText: { fontSize: 14, color: "#0f766e" },
});
