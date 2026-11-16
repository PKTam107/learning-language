import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Zap, GraduationCap, BookOpen, Brain, ChevronRight } from "lucide-react-native";
import { LEARNING_MODES } from "@/lib/navigation";
import { useStudySummary } from "@/hooks/useStudySummary";
import { Button } from "@/components/ui/Button";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/lib/theme";

const icons = { quick: Zap, today: GraduationCap, reading: BookOpen, weak: Brain };
export default function LearnScreen() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { metrics, loading, refreshing, error, refresh } = useStudySummary();
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}>
    <Text style={styles.heading}>Bạn muốn học theo cách nào?</Text>
    <Text style={styles.muted}>Ôn từ để nhớ lâu, đọc để dùng được từ. Mọi hoạt động học đều ở đây.</Text>
    {loading && <ActivityIndicator color={colors.brand} />}
    {!!error && <View style={styles.notice}><Text style={styles.muted}>Chưa tải được số thẻ đến hạn. Bạn vẫn có thể mở các hoạt động bên dưới.</Text><Button title="Thử lại" variant="ghost" onPress={refresh} /></View>}
    {LEARNING_MODES.map((mode) => {
      const Icon = icons[mode.id];
      return <Pressable key={mode.id} accessibilityRole="button" accessibilityLabel={mode.title} accessibilityHint={mode.description} onPress={() => router.push(mode.href)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
        <View style={styles.icon}><Icon size={24} color={colors.brand} /></View>
        <View style={styles.main}>
          <Text style={styles.title}>{mode.title}</Text>
          <Text style={styles.muted}>{mode.description}</Text>
          {(mode.id === "today" || mode.id === "quick") && metrics && !error && <Text style={styles.count}>{metrics.dueToday > 0 ? `${mode.id === "quick" ? Math.min(5, metrics.dueToday) : metrics.dueToday} từ sẵn sàng` : "Chưa có thẻ đến hạn trong hạn mức hôm nay"}</Text>}
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>;
    })}
    <View style={styles.notice}>
      <Text style={styles.title}>Muốn học một bộ từ cụ thể?</Text>
      <Text style={styles.muted}>Vào Bộ từ để chọn bộ, thêm từ mới hoặc chỉnh nội dung thẻ.</Text>
      <Button title="Mở Bộ từ" variant="secondary" onPress={() => router.navigate("/decks")} />
    </View>
  </ScrollView>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 16, paddingBottom: 24, gap: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text }, title: { fontSize: 17, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, lineHeight: 21, color: colors.textMuted }, count: { fontSize: 12, color: colors.brand, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card },
  icon: { padding: 10, borderRadius: 12, backgroundColor: colors.brandLight }, main: { flex: 1, gap: 5 },
  notice: { gap: 10, padding: 16, borderRadius: 14, backgroundColor: colors.sunken },
});
