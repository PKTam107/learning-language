import { Audio } from "expo-av";
import * as Speech from "expo-speech";

interface PlayOpts {
  url?: string | null;
  /** Văn bản để đọc bằng TTS khi không có URL audio. */
  text?: string | null;
  label?: string; // "US" | "UK"
}

/**
 * Phát âm một lần: ưu tiên file audio (expo-av), fallback TTS (expo-speech).
 * Fire-and-forget, tự giải phóng sound khi phát xong. Nuốt lỗi để không chặn học.
 */
export async function playPronunciation({ url, text, label }: PlayOpts): Promise<void> {
  if (url) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) void sound.unloadAsync();
      });
      return;
    } catch {
      // Audio lỗi (mất mạng / URL hỏng) → rơi xuống TTS.
    }
  }
  if (text) {
    Speech.stop();
    Speech.speak(text, { language: label === "UK" ? "en-GB" : "en-US" });
  }
}
