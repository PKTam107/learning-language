import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import * as Speech from "expo-speech";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/contexts/ThemeContext";
export function ReadingAudio({ text, children }: { text: string; children: ReactNode }) {
  const colors = useThemeColors();
  const [playing, setPlaying] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sentences, setSentences] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [error, setError] = useState("");
  const request = useRef(0);
  const stop = useCallback(() => { request.current++; void Speech.stop(); setPlaying(false); }, []);
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  useEffect(() => { setHidden(false); setSentences(false); return () => { request.current++; void Speech.stop(); }; }, [text]);
  async function play(value: string) {
    const id = ++request.current;
    try {
    await Speech.stop();
    if (id !== request.current) return;
    setError(""); setPlaying(true);
    Speech.speak(value, { language: "en-US", rate, onDone: () => { if (id === request.current) setPlaying(false); }, onError: () => { if (id === request.current) { setPlaying(false); setError("Chưa phát được giọng đọc. Hãy kiểm tra âm thanh rồi thử lại."); } } });
    } catch { if (id === request.current) { setPlaying(false); setError("Chưa phát được giọng đọc. Hãy thử lại."); } }
  }
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: "row", gap: 8 }}><Button title="Nghe cả bài" onPress={() => void play(text)} style={{ flex: 1 }} /><Button title="Dừng" variant="secondary" disabled={!playing} onPress={stop} /></View>
    <Button title={`Tốc độ: ${rate === 1 ? "Bình thường" : "Chậm"}`} variant="secondary" onPress={() => { stop(); setRate(rate === 1 ? 0.85 : 1); }} />
    <Button title={hidden ? "Hiện đoạn văn" : "Ẩn đoạn văn để luyện nghe"} variant="ghost" onPress={() => setHidden(!hidden)} />
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
    {!hidden ? <>{children}<Button title={sentences ? "Thu gọn từng câu" : "Nghe từng câu"} variant="secondary" onPress={() => setSentences(!sentences)} />{sentences && (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]).map((sentence, index) => <Button key={index} title={`🔊 ${sentence.trim()}`} variant="secondary" onPress={() => void play(sentence.trim())} />)}</> : <Text style={{ color: colors.textMuted }}>Đoạn văn đang ẩn. Bấm Nghe cả bài để luyện nghe.</Text>}
  </View>;
}
