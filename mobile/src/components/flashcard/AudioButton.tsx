import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { colors, radius } from "@/lib/theme";
import { Volume2 } from "lucide-react-native";

interface Props {
  url?: string | null;
  /** Văn bản để đọc bằng TTS khi không có URL audio (vd cụm từ). */
  text?: string | null;
  label?: string; // "US" | "UK"
}

/**
 * Nút phát âm. Ưu tiên file audio (expo-av); nếu không có URL nhưng có `text`
 * thì đọc bằng TTS (expo-speech) — giọng US/UK theo label. Ẩn nếu không có cả hai.
 */
export function AudioButton({ url, text, label }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Giải phóng sound khi unmount.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  if (!url && !text) return null;

  async function play() {
    if (url) {
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
      return;
    }
    if (text) {
      Speech.stop();
      Speech.speak(text, { language: label === "UK" ? "en-GB" : "en-US" });
    }
  }

  return (
    <Pressable
      onPress={play}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityLabel={`Nghe phát âm ${label ?? ""}`}
    >
      <Volume2 size={14} color={colors.brandDark} />
      {!!label && <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.6 },
  text: { color: colors.brandDark, fontSize: 13, fontWeight: "600" },
});
