import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  DEFAULT_SETTINGS,
  ensurePermissions,
  loadReminderSettings,
  refreshReminders,
  saveReminderSettings,
  type ReminderSettings,
} from "@/lib/notifications";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing } from "@/lib/theme";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function SettingsScreen() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadReminderSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const s = settings;
  const update = (patch: Partial<ReminderSettings>) =>
    setSettings((prev) => ({ ...(prev ?? DEFAULT_SETTINGS), ...patch }));

  function updateTime(i: number, val: string) {
    const times = [...s.times];
    times[i] = val;
    update({ times });
  }
  function addTime() {
    update({ times: [...s.times, "08:00"] });
  }
  function removeTime(i: number) {
    update({ times: s.times.filter((_, idx) => idx !== i) });
  }

  async function handleSave() {
    setMsg(null);
    if (s.enabled) {
      if (s.times.length === 0) {
        Alert.alert("Nhắc ôn", "Thêm ít nhất một mốc giờ nhắc.");
        return;
      }
      if (!s.times.every((t) => HHMM.test(t.trim()))) {
        Alert.alert("Nhắc ôn", "Giờ phải đúng định dạng HH:MM (ví dụ 20:30).");
        return;
      }
    }
    setSaving(true);
    try {
      const normalized: ReminderSettings = {
        ...s,
        times: s.times.map((t) => t.trim()),
      };
      if (normalized.enabled && !(await ensurePermissions())) {
        Alert.alert(
          "Chưa cấp quyền",
          "Hãy cho phép thông báo trong Cài đặt hệ thống để nhận nhắc ôn."
        );
      }
      await saveReminderSettings(normalized);
      await refreshReminders();
      setSettings(normalized);
      const scheduled =
        await Notifications.getAllScheduledNotificationsAsync();
      setMsg(
        normalized.enabled
          ? `Đã lưu · đang đặt ${scheduled.length} lịch nhắc.`
          : "Đã tắt nhắc ôn."
      );
    } catch (e) {
      Alert.alert("Lỗi", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!(await ensurePermissions())) {
      Alert.alert("Chưa cấp quyền", "Hãy cho phép thông báo trước đã.");
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "LinguaCards 🎴",
        body: "Thử thông báo — bạn sẽ nhận nhắc ôn như thế này.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
    setMsg("Sẽ gửi một thông báo thử sau ~5 giây.");
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Nhắc ôn" }} />

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Bật nhắc ôn</Text>
            <Text style={styles.hint}>
              Thông báo tại máy nhắc bạn ôn từ đến hạn.
            </Text>
          </View>
          <Switch
            value={s.enabled}
            onValueChange={(v) => update({ enabled: v })}
            trackColor={{ true: colors.brand }}
          />
        </View>
      </View>

      <View style={[styles.card, !s.enabled && styles.dim]} pointerEvents={s.enabled ? "auto" : "none"}>
        <Text style={styles.sectionTitle}>Giờ nhắc (nhiều lần/ngày)</Text>
        {s.times.map((t, i) => (
          <View key={i} style={styles.timeRow}>
            <TextInput
              value={t}
              onChangeText={(v) => updateTime(i, v)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSubtle}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.timeInput}
            />
            <Pressable onPress={() => removeTime(i)} hitSlop={8}>
              <Text style={styles.remove}>Xoá</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addTime} hitSlop={8}>
          <Text style={styles.addTime}>＋ Thêm giờ</Text>
        </Pressable>

        <View style={[styles.row, styles.weekendRow]}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Nhắc cả cuối tuần</Text>
            <Text style={styles.hint}>Tắt để chỉ nhắc T2–T6.</Text>
          </View>
          <Switch
            value={s.includeWeekends}
            onValueChange={(v) => update({ includeWeekends: v })}
            trackColor={{ true: colors.brand }}
          />
        </View>
      </View>

      {!!msg && <Text style={styles.msg}>{msg}</Text>}

      <Button title="Lưu" onPress={handleSave} loading={saving} />
      <Button
        title="Gửi thử ngay"
        variant="secondary"
        onPress={handleTest}
        style={styles.testBtn}
      />

      <Text style={styles.note}>
        Lưu ý: số từ hiển thị trong thông báo được cập nhật mỗi khi bạn mở app
        hoặc học xong, nên có thể chênh nhẹ so với thực tế tại thời điểm nhắc.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dim: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowText: { flex: 1, paddingRight: spacing.md },
  label: { fontSize: 16, fontWeight: "600", color: colors.text },
  hint: { marginTop: 2, fontSize: 13, color: colors.textMuted },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  remove: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  addTime: { color: colors.brand, fontSize: 15, fontWeight: "600" },
  weekendRow: { marginTop: spacing.sm },
  msg: { color: colors.success, fontSize: 14 },
  testBtn: { marginTop: spacing.xs },
  note: { marginTop: spacing.sm, fontSize: 12, color: colors.textSubtle, lineHeight: 18 },
});
