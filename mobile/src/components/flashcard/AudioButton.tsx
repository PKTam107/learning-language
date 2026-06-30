import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Audio } from "expo-av";
import { colors, radius } from "@/lib/theme";

interface Props {
  url?: string | null;
  label?: string; // "US" | "UK"
}

/** Nút phát âm (expo-av). Ẩn nếu không có URL audio. */
export function AudioButton({ url, label }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Giải phóng sound khi unmount.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  if (!url) return null;

  async function play() {
    try {
      // Tạo lại mỗi lần để tua về đầu đơn giản, gọn bộ nhớ.
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: url as string },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch {
      // Nuốt lỗi phát audio (mất mạng / URL hỏng) — không chặn học.
    }
  }

  return (
    <Pressable
      onPress={play}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityLabel={`Nghe phát âm ${label ?? ""}`}
    >
      <Text style={styles.text}>🔊 {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.6 },
  text: { color: colors.brandDark, fontSize: 13, fontWeight: "600" },
});
