import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useSettings } from "@/lib/settings";
import {
  scheduleDailyReminder,
  cancelDailyReminder,
} from "@/lib/notifications";
import { colors, radius, spacing } from "@/lib/theme";

const HOUR_OPTIONS = [7, 8, 9, 12, 18, 20, 21, 22];

export default function SettingsScreen() {
  const { settings, ready, update } = useSettings();
  const [busy, setBusy] = useState(false);

  async function toggleReminder(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        const okScheduled = await scheduleDailyReminder(settings.reminderHour);
        if (!okScheduled) {
          Alert.alert(
            "Chưa bật được nhắc học",
            "Bạn cần cho phép LinguaCards gửi thông báo trong Cài đặt hệ thống."
          );
          return;
        }
        update({ reminderEnabled: true });
      } else {
        await cancelDailyReminder();
        update({ reminderEnabled: false });
      }
    } finally {
      setBusy(false);
    }
  }

  async function pickHour(hour: number) {
    update({ reminderHour: hour });
    if (settings.reminderEnabled) {
      // Đặt lại lịch theo giờ mới.
      await scheduleDailyReminder(hour);
    }
  }

  if (!ready) return <View style={styles.flex} />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Cài đặt" }} />

      {/* --- Học tập --- */}
      <Text style={styles.section}>Học tập</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Tự phát âm khi lật thẻ</Text>
            <Text style={styles.rowDesc}>
              Đọc từ tiếng Anh mỗi khi bạn lật xem đáp án.
            </Text>
          </View>
          <Switch
            value={settings.autoSpeak}
            onValueChange={(v) => update({ autoSpeak: v })}
          />
        </View>
      </View>

      {/* --- Nhắc học --- */}
      <Text style={styles.section}>Nhắc học hằng ngày</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Bật nhắc học</Text>
            <Text style={styles.rowDesc}>
              Nhận thông báo mỗi ngày để giữ chuỗi ngày học.
            </Text>
          </View>
          <Switch
            value={settings.reminderEnabled}
            onValueChange={toggleReminder}
            disabled={busy}
          />
        </View>

        {settings.reminderEnabled && (
          <View style={styles.hourWrap}>
            <Text style={styles.rowLabel}>Giờ nhắc</Text>
            <View style={styles.chipRow}>
              {HOUR_OPTIONS.map((h) => {
                const active = settings.reminderHour === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => pickHour(h)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {String(h).padStart(2, "0")}:00
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <Text style={styles.hint}>
        Nhắc học dùng thông báo cục bộ trên máy — không cần internet và hoàn toàn
        miễn phí.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  section: {
    marginTop: spacing.md,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowDesc: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  hourWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  chipText: { fontSize: 14, color: colors.textMuted },
  chipTextActive: { color: colors.brandDark, fontWeight: "700" },
  hint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
  },
});
