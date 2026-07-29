import { useEffect, useState } from "react";
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
import { AlarmClock, ChevronRight } from "lucide-react-native";
import { useSettings } from "@/lib/settings";
import {
  cancelDailyReminder,
  formatCountdown,
  formatHm,
  nextReminderIn,
  partOfDay,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { TimePickerSheet } from "@/components/ui/TimePickerSheet";
import { colors, radius, spacing } from "@/lib/theme";

export default function SettingsScreen() {
  const { settings, ready, update } = useSettings();
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Cập nhật đồng hồ để dòng "còn bao lâu" không bị cũ khi màn hình mở lâu.
  useEffect(() => {
    if (!settings.reminderEnabled) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [settings.reminderEnabled]);

  async function toggleReminder(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        const okScheduled = await scheduleDailyReminder(
          settings.reminderHour,
          settings.reminderMinute
        );
        if (!okScheduled) {
          Alert.alert(
            "Chưa bật được nhắc học",
            "Bạn cần cho phép LinguaCards gửi thông báo trong Cài đặt hệ thống."
          );
          return;
        }
        setNow(new Date());
        update({ reminderEnabled: true });
      } else {
        await cancelDailyReminder();
        update({ reminderEnabled: false });
      }
    } finally {
      setBusy(false);
    }
  }

  async function pickTime(hour: number, minute: number) {
    setPickerOpen(false);
    update({ reminderHour: hour, reminderMinute: minute });
    setNow(new Date());
    if (settings.reminderEnabled) {
      // Đặt lại lịch theo giờ mới.
      await scheduleDailyReminder(hour, minute);
    }
  }

  if (!ready) return <View style={styles.flex} />;

  const next = nextReminderIn(settings.reminderHour, settings.reminderMinute, now);

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
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Đổi giờ nhắc"
            style={({ pressed }) => [styles.timeCard, pressed && styles.pressed]}
          >
            <View style={styles.clockBadge}>
              <AlarmClock size={22} color={colors.brandDark} />
            </View>

            <View style={styles.rowText}>
              <Text style={styles.time}>
                {formatHm(settings.reminderHour, settings.reminderMinute)}
              </Text>
              <Text style={styles.timeSub}>
                Mỗi ngày, buổi {partOfDay(settings.reminderHour)}
              </Text>
              <Text style={styles.timeNext}>
                Lần nhắc tới: {next.tomorrow ? "mai" : "hôm nay"} ·{" "}
                {formatCountdown(next.minutes)}
              </Text>
            </View>

            <View style={styles.editWrap}>
              <Text style={styles.editText}>Đổi</Text>
              <ChevronRight size={18} color={colors.textSubtle} />
            </View>
          </Pressable>
        )}
      </View>

      <Text style={styles.hint}>
        Nhắc học dùng thông báo cục bộ trên máy — không cần internet và hoàn toàn
        miễn phí. Bạn chọn được bất kỳ giờ:phút nào.
      </Text>

      <TimePickerSheet
        open={pickerOpen}
        hour={settings.reminderHour}
        minute={settings.reminderMinute}
        onClose={() => setPickerOpen(false)}
        onConfirm={pickTime}
      />
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

  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brandLight,
    backgroundColor: colors.brandLight,
    padding: spacing.md,
  },
  pressed: { opacity: 0.7 },
  clockBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  time: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.brandDark,
    fontVariant: ["tabular-nums"],
  },
  timeSub: { fontSize: 13, fontWeight: "600", color: colors.brandDark },
  timeNext: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  editWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  editText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },

  hint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
  },
});
