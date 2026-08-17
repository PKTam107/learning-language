import { StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import {
  evaluateAchievements,
  summarize,
  type Achievement,
  type AchievementMetrics,
} from "@/lib/achievements";
import { radius, spacing, type ThemeColors, type TintName } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

/** Mảng màu theo bậc mốc trong nhóm (thấp → cao) — khớp bản web. */
const TIER_TINT: TintName[] = ["emerald", "sky", "amber", "orange", "purple"];

/**
 * Huy hiệu: mốc theo số thẻ, số từ đã thuộc, chuỗi ngày học, lượt ôn và số ngày
 * có học. Mốc đã đạt hiện màu, chưa đạt hiện xám kèm tiến độ.
 */
export function Achievements({ metrics }: { metrics: AchievementMetrics }) {
  const styles = useStyles(makeStyles);
  const list = evaluateAchievements(metrics);
  const { unlocked, total, next } = summarize(list);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Trophy size={18} color="#f59e0b" />
          <Text style={styles.title}>Huy hiệu</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {unlocked}/{total} đã mở
          </Text>
        </View>
      </View>

      {next && (
        <View style={styles.nextBox}>
          <Text style={styles.nextIcon}>{next.icon}</Text>
          <View style={styles.nextMain}>
            <Text style={styles.nextTitle}>Sắp đạt: {next.title}</Text>
            <Text style={styles.nextDetail}>
              {next.detail} — còn {next.remaining}
            </Text>
          </View>
          <Text style={styles.nextPercent}>{next.percent}%</Text>
        </View>
      )}

      <View style={styles.grid}>
        {list.map((a) => (
          <Badge key={a.id} item={a} />
        ))}
      </View>
    </View>
  );
}

function Badge({ item }: { item: Achievement }) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const tone = item.unlocked
    ? colors.tints[TIER_TINT[Math.min(item.tier, TIER_TINT.length) - 1]]
    : { bg: colors.sunken, border: colors.border };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      <View style={styles.badgeHead}>
        <Text style={[styles.badgeIcon, !item.unlocked && styles.dim]}>
          {item.icon}
        </Text>
        <View style={styles.badgeMain}>
          <Text
            style={[styles.badgeTitle, !item.unlocked && styles.badgeTitleLocked]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.badgeDetail} numberOfLines={2}>
            {item.detail}
          </Text>
        </View>
      </View>

      {item.unlocked ? (
        <Text style={styles.unlockedText}>Đã mở ✓</Text>
      ) : (
        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${item.percent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {item.current}/{item.goal}
          </Text>
        </View>
      )}
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
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    headLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: colors.tints.amber.bg,
    },
    pillText: { fontSize: 12, fontWeight: "700", color: colors.tints.amber.fg },
    nextBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.sunken,
    },
    nextIcon: { fontSize: 20, opacity: 0.5 },
    nextMain: { flex: 1, minWidth: 0 },
    nextTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
    nextDetail: { fontSize: 12, color: colors.textMuted },
    nextPercent: { fontSize: 14, fontWeight: "700", color: colors.brand },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    badge: {
      width: "48%",
      flexGrow: 1,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    badgeHead: { flexDirection: "row", gap: spacing.sm },
    badgeIcon: { fontSize: 22 },
    dim: { opacity: 0.35 },
    badgeMain: { flex: 1, minWidth: 0 },
    badgeTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
    badgeTitleLocked: { color: colors.textMuted },
    badgeDetail: { fontSize: 11, color: colors.textMuted, lineHeight: 14 },
    unlockedText: {
      marginTop: spacing.sm,
      fontSize: 11,
      fontWeight: "700",
      color: colors.success,
    },
    progressWrap: { marginTop: spacing.sm },
    track: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    fill: { height: "100%", backgroundColor: colors.brand, borderRadius: radius.full },
    progressText: { marginTop: 2, fontSize: 11, color: colors.textSubtle },
  });
