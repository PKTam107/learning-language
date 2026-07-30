import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { CalendarCheck, Flame, Repeat, Trophy } from "lucide-react-native";
import {
  fetchProgressData,
  EMPTY_PROGRESS,
  type ProgressData,
} from "@/lib/insights";
import { evaluateAchievements, summarize } from "@/lib/achievements";
import { Achievements } from "@/components/Achievements";
import { Heatmap } from "@/components/Heatmap";
import { ReviewCalendar, dueInNextDays } from "@/components/ReviewCalendar";
import { colors, radius, spacing } from "@/lib/theme";

/**
 * Màn Tiến độ: nạp **một lần** dữ liệu dùng chung (nhật ký ôn + thẻ + tiến độ)
 * rồi dựng heatmap, huy hiệu và lịch ôn từ cùng bộ dữ liệu đó.
 */
export default function ProgressScreen() {
  const [data, setData] = useState<ProgressData>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fetchProgressData());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const { activity, metrics, due } = data;
  const { unlocked, total } = summarize(evaluateAchievements(metrics));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.brand}
        />
      }
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.tiles}>
        <Tile
          icon={<Flame size={14} color="#f97316" />}
          label="Chuỗi"
          value={`${activity.streak} ngày`}
          hint={`Dài nhất ${activity.bestStreak}`}
        />
        <Tile
          icon={<Repeat size={14} color={colors.brand} />}
          label="Lượt ôn"
          value={metrics.totalReviews}
          hint={`${activity.activeDays} ngày học`}
        />
        <Tile
          icon={<CalendarCheck size={14} color="#d97706" />}
          label="Cần ôn"
          value={due.dueNow}
          hint={`7 ngày tới: ${dueInNextDays(due, 7)}`}
        />
        <Tile
          icon={<Trophy size={14} color="#f59e0b" />}
          label="Huy hiệu"
          value={`${unlocked}/${total}`}
          hint={`${metrics.masteredCards}/${metrics.totalCards} đã thuộc`}
        />
      </View>

      <Heatmap
        data={activity.heatmap}
        busiest={activity.busiest}
        totalReviews={metrics.totalReviews}
        activeDays={activity.activeDays}
      />

      <Achievements metrics={metrics} />

      <ReviewCalendar due={due} />
    </ScrollView>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        {icon}
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      {!!hint && <Text style={styles.tileHint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  error: { color: colors.danger, fontSize: 14, marginBottom: spacing.sm },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    width: "48%",
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  tileLabel: {
    fontSize: 11,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  tileValue: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  tileHint: { fontSize: 11, color: colors.textSubtle },
});
