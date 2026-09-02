import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Brain, GraduationCap } from "lucide-react-native";
import type { WeakWord } from "@/lib/weak";
import { CefrBadge } from "@/components/flashcard/Enrichment";
import { Button } from "@/components/ui/Button";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

/**
 * "Bạn hay quên": các từ bị đánh giá "Chưa thuộc" nhiều nhất. Ẩn nếu rỗng.
 * Chạm một từ → mở bộ thẻ chứa nó.
 *
 * Kèm nút mở phiên ôn đúng những từ này — trước đây khối này chỉ để đọc, tức
 * app chỉ ra từ yếu của bạn rồi không cho làm gì với nó. Danh sách ở trang chủ
 * chỉ là bản xem trước nên nhãn nút không nêu con số (phiên lấy tối đa
 * WEAK_SESSION_SIZE từ, xem lib/weak.ts).
 */
export function WeakWords({ words }: { words: WeakWord[] }) {
  const styles = useStyles(makeStyles);
  const colors = useThemeColors();
  const router = useRouter();
  if (!words || words.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Brain size={18} color="#f43f5e" />
        <Text style={styles.title}>Bạn hay quên</Text>
      </View>

      {words.map((w, i) => (
        <Pressable
          key={w.cardId}
          onPress={() => router.push(`/decks/${w.deckId}`)}
          style={({ pressed }) => [
            styles.row,
            i > 0 && styles.rowBorder,
            pressed && styles.rowPressed,
          ]}
        >
          <View style={styles.left}>
            <View style={styles.termLine}>
              <Text style={styles.term} numberOfLines={1}>
                {w.term}
              </Text>
              <CefrBadge level={w.cefrLevel} />
              {!!w.partOfSpeech && (
                <Text style={styles.pos}>{w.partOfSpeech}</Text>
              )}
            </View>
            {!!w.meaningVi && (
              <Text style={styles.meaning} numberOfLines={1}>
                {w.meaningVi}
              </Text>
            )}
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>quên {w.hardCount}×</Text>
          </View>
        </Pressable>
      ))}
      <Button
        title="Ôn những từ này"
        icon={<GraduationCap size={16} color={colors.text} />}
        variant="secondary"
        onPress={() => router.push("/study/weak")}
        style={styles.studyBtn}
      />
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
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    title: { fontSize: 16, fontWeight: "700", color: colors.text },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    rowPressed: { opacity: 0.6 },
    left: { flex: 1, minWidth: 0 },
    termLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    term: { fontSize: 15, fontWeight: "600", color: colors.text, flexShrink: 1 },
    pos: { fontSize: 12, color: colors.textSubtle },
    meaning: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.tints.rose.bg,
    },
    badgeText: { fontSize: 12, fontWeight: "700", color: colors.tints.rose.fg },
    studyBtn: { marginTop: spacing.md },
  });
