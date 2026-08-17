import { StyleSheet, Text, View } from "react-native";
import { Check, Target } from "lucide-react-native";
import type { DailyChallenge as Challenge } from "@/lib/challenge";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

/**
 * "Thử thách hôm nay": 3–4 nhiệm vụ tự sinh theo ngày (ôn N lượt, thêm từ mới,
 * giữ chuỗi...). Dữ liệu do màn hình nạp (fetchChallengeMetrics + buildDailyChallenge).
 */
export function DailyChallenge({ challenge }: { challenge: Challenge | null }) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  if (!challenge || challenge.quests.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Target size={18} color={colors.brand} />
          <Text style={styles.title}>Thử thách hôm nay</Text>
        </View>
        <View style={[styles.pill, challenge.allDone && styles.pillDone]}>
          <Text style={[styles.pillText, challenge.allDone && styles.pillTextDone]}>
            {challenge.doneCount}/{challenge.quests.length}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${challenge.percent}%` },
            challenge.allDone && styles.fillDone,
          ]}
        />
      </View>

      {challenge.quests.map((q, i) => (
        <View key={q.id} style={[styles.row, i > 0 && styles.rowBorder]}>
          <View style={[styles.icon, q.done && styles.iconDone]}>
            {q.done ? (
              <Check size={14} color={colors.success} strokeWidth={3} />
            ) : (
              <Text style={styles.iconText}>{q.icon}</Text>
            )}
          </View>
          <View style={styles.rowMain}>
            <Text
              style={[styles.questTitle, q.done && styles.questTitleDone]}
              numberOfLines={1}
            >
              {q.title}
            </Text>
            <Text style={styles.questHint} numberOfLines={1}>
              {q.hint}
            </Text>
          </View>
          <Text style={[styles.count, q.done && styles.countDone]}>
            {Math.min(q.current, q.target)}/{q.target} {q.unit}
          </Text>
        </View>
      ))}

      <Text style={styles.footer}>
        {challenge.allDone
          ? "Xong hết thử thách hôm nay — quá đỉnh! 🎉"
          : "Nhiệm vụ tự đổi mỗi ngày lúc 0h."}
      </Text>
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
      marginBottom: spacing.sm,
    },
    headLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: colors.sunken,
    },
    pillDone: { backgroundColor: colors.tints.green.bg },
    pillText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    pillTextDone: { color: colors.tints.green.fg },
    track: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: colors.sunken,
      overflow: "hidden",
      marginBottom: spacing.sm,
    },
    fill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.brand },
    fillDone: { backgroundColor: colors.success },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    icon: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: colors.sunken,
      alignItems: "center",
      justifyContent: "center",
    },
    iconDone: { backgroundColor: colors.tints.green.bg },
    iconText: { fontSize: 15 },
    rowMain: { flex: 1, minWidth: 0 },
    questTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
    questTitleDone: {
      color: colors.textSubtle,
      textDecorationLine: "line-through",
    },
    questHint: { fontSize: 12, color: colors.textSubtle },
    count: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    countDone: { color: colors.success },
    footer: { marginTop: spacing.sm, fontSize: 12, color: colors.textSubtle },
  });
