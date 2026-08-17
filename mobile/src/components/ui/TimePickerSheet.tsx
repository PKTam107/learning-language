import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Modal } from "./Modal";
import { WheelPicker } from "./WheelPicker";
import { Button } from "./Button";
import { formatHm, partOfDay } from "@/lib/notifications";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles } from "@/contexts/ThemeContext";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** Gợi ý nhanh cho các mốc hay dùng. */
const PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: "Sáng sớm", hour: 6, minute: 30 },
  { label: "Buổi sáng", hour: 8, minute: 0 },
  { label: "Nghỉ trưa", hour: 12, minute: 30 },
  { label: "Buổi tối", hour: 20, minute: 0 },
  { label: "Trước ngủ", hour: 22, minute: 30 },
];

interface Props {
  open: boolean;
  hour: number;
  minute: number;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
}

/** Sheet chọn giờ:phút tự do bằng 2 bánh xe + vài mốc gợi ý. */
export function TimePickerSheet({
  open,
  hour,
  minute,
  onClose,
  onConfirm,
}: Props) {
  const styles = useStyles(makeStyles);
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  // Đồng bộ lại mỗi lần mở để không giữ giá trị nháp của lần trước.
  useEffect(() => {
    if (!open) return;
    setH(hour);
    setM(minute);
  }, [open, hour, minute]);

  return (
    <Modal open={open} onClose={onClose} title="Chọn giờ nhắc">
      <View style={styles.previewWrap}>
        <Text style={styles.preview}>{formatHm(h, m)}</Text>
        <Text style={styles.previewSub}>mỗi ngày, buổi {partOfDay(h)}</Text>
      </View>

      <View style={styles.wheels}>
        <WheelPicker
          values={HOURS}
          value={h}
          onChange={setH}
          accessibilityLabel="Giờ"
        />
        <Text style={styles.colon}>:</Text>
        <WheelPicker
          values={MINUTES}
          value={m}
          onChange={setM}
          accessibilityLabel="Phút"
        />
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((p) => {
          const active = p.hour === h && p.minute === m;
          return (
            <Pressable
              key={p.label}
              onPress={() => {
                setH(p.hour);
                setM(p.minute);
              }}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text style={[styles.presetTime, active && styles.presetTextActive]}>
                {formatHm(p.hour, p.minute)}
              </Text>
              <Text style={[styles.presetLabel, active && styles.presetTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button
          title="Hủy"
          variant="secondary"
          onPress={onClose}
          style={styles.action}
        />
        <Button
          title="Xong"
          onPress={() => onConfirm(h, m)}
          style={styles.action}
        />
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    previewWrap: { alignItems: "center", gap: 2 },
    preview: {
      fontSize: 40,
      fontWeight: "800",
      color: colors.brandDark,
      fontVariant: ["tabular-nums"],
    },
    previewSub: { fontSize: 13, color: colors.textMuted },
    wheels: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    colon: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.textSubtle,
      marginBottom: 2,
    },
    presetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: spacing.sm,
    },
    preset: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    presetActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
    presetTime: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    presetLabel: { fontSize: 11, color: colors.textMuted },
    presetTextActive: { color: colors.brandDark },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    action: { flex: 1 },
  });
