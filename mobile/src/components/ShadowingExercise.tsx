import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { createRecorder } from "@/lib/recorder";
import { useRecorder } from "@/hooks/useRecorder";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/contexts/ThemeContext";
export function ShadowingExercise({ sentence }: { sentence: string }) {
  const colors = useThemeColors();
  const adapter = useMemo(() => createRecorder(), []);
  const recording = useRecorder(adapter);
  const [rate, setRate] = useState(0.85);
  const [sampleError, setSampleError] = useState("");
  const [samplePlaying, setSamplePlaying] = useState(false);
  const sampleRequest = useRef(0);
  const phase = useRef(recording.phase);
  phase.current = recording.phase;
  const stopSample = useCallback(() => { sampleRequest.current++; void Speech.stop(); setSamplePlaying(false); }, []);
  const leave = useCallback(() => { recording.reset(); stopSample(); }, [recording.reset, stopSample]);
  useFocusEffect(useCallback(() => () => leave(), [leave]));
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => { if (state === "background" || (state === "inactive" && phase.current === "recording")) leave(); });
    return () => { listener.remove(); sampleRequest.current++; void Speech.stop(); };
  }, [leave]);
  const busy = ["requesting", "stopping", "saving"].includes(recording.phase);
  const capturing = recording.phase === "recording";
  async function sample() {
    stopSample(); setSampleError("");
    const id = sampleRequest.current;
    try {
      await recording.stopPlayback(); await Speech.stop(); if (id !== sampleRequest.current) return;
      setSamplePlaying(true);
      Speech.speak(sentence, { language: "en-US", rate,
        onDone: () => { if (id === sampleRequest.current) setSamplePlaying(false); },
        onError: () => { if (id === sampleRequest.current) { setSamplePlaying(false); setSampleError("Chưa phát được câu mẫu. Hãy thử lại."); } },
      });
    } catch { if (id === sampleRequest.current) { setSamplePlaying(false); setSampleError("Chưa phát được câu mẫu. Hãy thử lại."); } }
  }
  return <View style={{ gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
    <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Thu âm và nghe đối chiếu</Text><Text style={{ color: colors.text, fontSize: 18 }}>{sentence}</Text>
    <Text style={{ color: colors.textMuted }}>Nghe mẫu → thu giọng mình → nghe lại hai bản. Tự so sánh, không chấm điểm tự động. Tối đa 60 giây; bản thu tạm bị xóa khi rời màn hoặc đưa app ra nền. Bấm Lưu trước khi rời màn nếu muốn giữ.</Text>
    <Button title="Nghe mẫu" variant="secondary" disabled={busy || capturing} onPress={() => void sample()} /><Button title="Dừng mẫu" variant="secondary" disabled={!samplePlaying} onPress={stopSample} />
    <Button title={`Tốc độ mẫu: ${rate === 1 ? "Bình thường" : "Chậm"}`} variant="secondary" disabled={busy || capturing} onPress={() => { stopSample(); setRate(rate === 1 ? 0.85 : 1); }} />
    {capturing ? <Button title="Dừng thu" onPress={() => void recording.finish()} /> : <Button title={recording.phase === "ready" ? "Thu lại" : "Thu giọng mình"} disabled={busy} onPress={() => { stopSample(); void recording.start(); }} />}
    <Button title="Nghe bản thu" variant="secondary" disabled={recording.phase !== "ready" || recording.playing} onPress={() => { stopSample(); void recording.play(); }} />
    <Button title="Dừng bản thu" variant="secondary" disabled={!recording.playing} onPress={() => void recording.stopPlayback()} />
    <Button title="Lưu bản thu trên thiết bị" variant="secondary" disabled={recording.phase !== "ready"} onPress={() => void recording.save()} />
    <Button title="Xóa bản thu trong phiên" variant="ghost" disabled={busy || recording.phase === "idle"} onPress={() => { stopSample(); recording.reset(); }} />
    <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{capturing ? "● Đang thu… Bấm Dừng thu khi nói xong." : busy ? "Đang xử lý…" : recording.playing ? "Đang phát bản thu…" : ""}</Text>
    {!!(recording.error || sampleError) && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{recording.error || sampleError}</Text>}
    {!!recording.message && <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted }}>{recording.message}</Text>}
  </View>;
}
export function ShadowingPractice({ sentences }: { sentences: string[] }) {
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);
  if (!sentences.length) return <Text style={{ color: colors.textMuted }}>Chưa có câu phù hợp. Hãy bổ sung câu ví dụ tiếng Anh vào thẻ.</Text>;
  return <View style={{ gap: 12 }}><Text style={{ color: colors.text }}>Câu {index + 1}/{sentences.length}</Text><ShadowingExercise key={`${index}-${sentences[index]}`} sentence={sentences[index]} /><Button title="Câu trước" variant="secondary" disabled={index === 0} onPress={() => setIndex(index - 1)} /><Button title={index + 1 === sentences.length ? "Về câu đầu" : "Câu tiếp theo"} variant="secondary" onPress={() => setIndex((index + 1) % sentences.length)} /></View>;
}
