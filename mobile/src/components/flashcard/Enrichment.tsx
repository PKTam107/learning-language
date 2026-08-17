import { StyleSheet, Text, View } from "react-native";
import { radius, spacing, type ThemeColors, type TintName } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

/** Mảng màu badge theo cấp CEFR (dễ → khó: xanh → cam → tím). */
const CEFR_TINT: Record<string, TintName> = {
  A1: "emerald",
  A2: "green",
  B1: "amber",
  B2: "orange",
  C1: "rose",
  C2: "purple",
};

/** Badge cấp độ CEFR (A1..C2). Ẩn nếu không có. */
export function CefrBadge({ level }: { level?: string | null }) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  if (!level) return null;
  const tint = CEFR_TINT[level];
  const c = tint ? colors.tints[tint] : { bg: colors.bg, fg: colors.textMuted };
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
  const styles = useStyles(makeStyles);
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    chipFamily: { backgroundColor: colors.tints.indigo.bg },
    chipFamilyText: { fontSize: 14, color: colors.tints.indigo.fg },
    chipColloc: { backgroundColor: colors.tints.teal.bg },
    chipCollocText: { fontSize: 14, color: colors.tints.teal.fg },
  });
