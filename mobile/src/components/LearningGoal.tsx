import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSettings } from "@/lib/settings";
import { fetchGoalProgress } from "@/lib/goal-progress";
import type { GoalProgress } from "@/lib/goals";
import { useThemeColors } from "@/contexts/ThemeContext";

export function LearningGoal() {
  const colors = useThemeColors();
  const router = useRouter();
  const { settings, ready } = useSettings();
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!ready) return;
    let alive = true;
    setError(false);
    fetchGoalProgress({ dailyGoal: settings.dailyGoal, weeklyDays: settings.weeklyDays })
      .then((data) => { if (alive) setProgress(data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [ready, settings.dailyGoal, settings.weeklyDays]));
  return <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, gap: 8 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: colors.text, fontWeight: "700" }}>Mục tiêu của bạn</Text><Pressable accessibilityRole="button" onPress={() => router.navigate("/settings")}><Text style={{ color: colors.brand }}>Điều chỉnh</Text></Pressable></View>
    {error ? <Text style={{ color: colors.textMuted }}>Chưa tải được tiến độ. Bạn vẫn có thể bắt đầu học.</Text> : !progress ? <Text style={{ color: colors.textMuted }}>Đang tải tiến độ…</Text> : <>
      <Text style={{ color: colors.text }}>Hôm nay: {progress.todayWords}/{progress.dailyTarget} từ{progress.dailyDone ? " · Hoàn thành! 🎉" : progress.dailyTarget ? ` · Còn ${Math.max(0, progress.dailyTarget - progress.todayWords)} từ nữa` : " · Thêm từ để bắt đầu"}</Text>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.brand, width: `${Math.min(100, progress.todayWords / (progress.dailyTarget || 1) * 100)}%` }} /></View>
      <Text style={{ color: colors.textMuted }}>Tuần này: {progress.weekDays}/{progress.weeklyTarget} ngày có học{progress.weeklyDone ? " · Đạt mục tiêu!" : " · T2–CN"}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Mỗi từ ôn chỉ đếm một lần/ngày. Bạn có thể nghỉ xen kẽ.</Text>
    </>}
  </View>;
}
