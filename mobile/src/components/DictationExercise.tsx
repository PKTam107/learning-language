import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { checkDictation } from "@/lib/dictation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useThemeColors } from "@/contexts/ThemeContext";
export function DictationExercise({ sentences }: { sentences: string[] }) {
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const request = useRef(0);
  const stop = useCallback(() => { request.current++; void Speech.stop(); setPlaying(false); }, []);
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  async function play() {
    const id = ++request.current;
    try {
      await Speech.stop(); if (id !== request.current) return;
      setError(""); setPlaying(true);
      Speech.speak(sentences[index], { language: "en-US", rate,
        onDone: () => { if (id === request.current) setPlaying(false); },
        onError: () => { if (id === request.current) { setPlaying(false); setError("Chưa phát được câu. Kiểm tra giọng tiếng Anh trên thiết bị rồi thử lại."); } },
      });
    } catch { if (id === request.current) { setPlaying(false); setError("Chưa phát được giọng đọc. Hãy thử lại."); } }
  }
  if (!sentences.length) return <Text style={{ color: colors.textMuted }}>Chưa có câu phù hợp. Hãy thêm câu ví dụ tiếng Anh từ 3–60 từ vào thẻ.</Text>;
  const result = checked ? checkDictation(sentences[index], answer) : null;
  function reset(next: number) { stop(); setIndex(next); setAnswer(""); setChecked(false); setError(""); }
  return <View style={{ gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>Nghe chép chính tả · Câu {index + 1}/{sentences.length}</Text>
    <Text style={{ color: colors.textMuted }}>Nghe rồi gõ lại. Bỏ qua chữ hoa và dấu câu; vẫn kiểm tra chính tả. Không thay đổi lịch ôn.</Text>
    <Button title="Nghe câu" onPress={() => void play()} /><Button title="Dừng" variant="secondary" disabled={!playing} onPress={stop} />
    <Button title={`Tốc độ: ${rate === 1 ? "Bình thường" : "Chậm"}`} variant="secondary" onPress={() => { stop(); setRate(rate === 1 ? 0.85 : 1); }} />
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
    <Text style={{ color: colors.text }}>Câu bạn nghe được</Text><Input accessibilityLabel="Câu bạn nghe được" value={answer} editable={!checked} onChangeText={setAnswer} maxLength={1500} autoCorrect={false} autoCapitalize="none" spellCheck={false} multiline style={{ minHeight: 100, textAlignVertical: "top" }} />
    <Button title="Kiểm tra" disabled={checked || !answer.trim()} onPress={() => { stop(); setChecked(true); }} />
    {result && <View accessibilityLiveRegion="polite" style={{ gap: 12 }}><Text style={{ color: colors.text, fontWeight: "600" }}>{result.correct ? "Chính xác!" : "Đối chiếu câu trả lời:"}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{result.tokens.map((token, i) => <Text key={i} style={{ color: token.kind === "correct" ? colors.tints.green.fg : colors.tints.amber.fg, backgroundColor: token.kind === "correct" ? colors.tints.green.bg : colors.tints.amber.bg, padding: 6, borderRadius: 6 }}>{token.kind === "missing" ? `Thiếu: ${token.text}` : token.kind === "extra" ? `Thừa: ${token.text}` : token.kind === "wrong" ? `${token.text} → ${token.expected}` : token.text}</Text>)}</View>
      <Text style={{ color: colors.text }}>{sentences[index]}</Text><Button title="Thử lại câu này" variant="secondary" onPress={() => reset(index)} /><Button title={index + 1 === sentences.length ? "Luyện lại từ đầu" : "Câu tiếp theo"} onPress={() => reset((index + 1) % sentences.length)} />
    </View>}
  </View>;
}
