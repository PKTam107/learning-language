import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useStudySummary } from "@/hooks/useStudySummary";
import { buildDailyChallenge } from "@/lib/challenge";
import { LearningGoal } from "@/components/LearningGoal";
import { StreakCard } from "@/components/StreakCard";
import { DailyChallenge } from "@/components/DailyChallenge";
import { Button } from "@/components/ui/Button";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/lib/theme";

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { settings, metrics, stats, loading, refreshing, error, refresh } = useStudySummary(true);
  const challenge = metrics ? buildDailyChallenge(metrics, new Date(), settings) : null;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}>
    <Text style={styles.heading}>Hôm nay học một chút nhé</Text>
    <Text style={styles.muted}>Bắt đầu từ vài từ, rồi chọn hoạt động bạn thích trong tab Học tập.</Text>
    {loading && <ActivityIndicator color={colors.brand} />}
    {!!error && <View style={styles.card}><Text style={styles.text}>Chưa tải được tiến độ học tập.</Text><Button title="Thử lại" variant="secondary" onPress={refresh} /></View>}
    {metrics && !error && <View style={[styles.card, styles.highlight]}>
      <Text style={styles.heading}>{metrics.dueToday > 0 ? `${metrics.dueToday} từ cần ôn hôm nay` : metrics.totalCards > 0 ? "Không còn thẻ đến hạn hôm nay" : "Bắt đầu kho từ của bạn"}</Text>
      <Text style={styles.muted}>{metrics.dueToday > 0 ? "Gộp thẻ đến hạn từ tất cả bộ từ, trong hạn mức từ mới của bạn." : metrics.totalCards > 0 ? "Bạn có thể đọc hiểu hoặc chọn một bộ từ để luyện thêm." : "Tạo bộ từ và thêm những từ tiếng Anh bạn muốn nhớ."}</Text>
      {metrics.dueToday > 0 ? <>
        <Button title={`Học nhanh ${Math.min(5, metrics.dueToday)} từ`} onPress={() => router.push("/study/today?quick=1")} />
        <Button title="Ôn hôm nay" variant="secondary" onPress={() => router.push("/study/today")} />
      </> : <Button title={metrics.totalCards > 0 ? "Mở Học tập" : "Tạo bộ từ đầu tiên"} onPress={() => router.navigate(metrics.totalCards > 0 ? "/learn" : "/decks")} />}
    </View>}
    <LearningGoal />
    <View style={styles.card}>
      <Text style={styles.heading}>Đọc hiểu</Text>
      <Text style={styles.muted}>Dùng từ trong kho để đọc đoạn ngắn, nghe phát âm và trả lời câu hỏi.</Text>
      <Button title="Bắt đầu đọc" variant="secondary" onPress={() => router.push("/reading")} />
      <Button title="Xem tất cả cách học" variant="ghost" onPress={() => router.navigate("/learn")} />
    </View>
    {metrics && !error && metrics.totalCards > 0 && <StreakCard stats={stats} />}
    {!error && <DailyChallenge challenge={challenge} />}
  </ScrollView>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 16, paddingBottom: 24, gap: 16 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 12 },
  highlight: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  heading: { fontSize: 18, fontWeight: "700", color: colors.text }, text: { fontSize: 15, color: colors.text },
  muted: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
});
