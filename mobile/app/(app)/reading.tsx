import { useReadingLibrary } from "@/hooks/useReadingLibrary";
import { createReadingStore } from "@/lib/reading-store";
import { ReadingAudio } from "@/components/ReadingAudio";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, useRouter } from "expo-router";
import { fetchDecks } from "@/lib/decks";
import { createReadingLesson } from "@/lib/api";
import { READING_TOPICS, readingSegments, type ReadingRequest } from "@/lib/reading";
import { useReadingLesson } from "@/hooks/useReadingLesson";
import type { Deck } from "@/types";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/lib/theme";
import { Modal } from "@/components/ui/Modal";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { CardPhoto } from "@/components/flashcard/CardPhoto";

export default function ReadingScreen() {
  const colors = useThemeColors();
  const { height } = useWindowDimensions();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckError, setDeckError] = useState(false);
  const [deckId, setDeckId] = useState("");
  const [activeSelect, setActiveSelect] = useState<"topic" | "deck" | null>(null);
  const [topic, setTopic] = useState<ReadingRequest["topic"]>("daily");
  const reading = useReadingLesson(createReadingLesson);
  const store = useMemo(() => createReadingStore(), []);
  const library = useReadingLibrary(store, reading.lesson, reading.answers);
  useEffect(() => {
    let alive = true;
    fetchDecks().then((data) => { if (alive) setDecks(data.filter((d) => d.source_language === "en" && d.target_language === "vi")); }).catch(() => { if (alive) setDeckError(true); });
    return () => { alive = false; };
  }, []);
  const { lesson } = reading;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Stack.Screen options={{ title: "Đọc hiểu" }} />
    <Button title="Luyện nghe chép chính tả từ câu ví dụ" variant="secondary" onPress={() => router.push("/dictation")} />
      <Text style={styles.title}>Đọc bằng kho từ của bạn</Text>
    <Text style={styles.muted}>Một đoạn 80–120 từ, dùng 3–5 từ trong kho. Chạm từ được đánh dấu để xem nghĩa và nghe.</Text>
    <View style={styles.card}>
      <Dropdown
        label="Chủ đề"
        value={topic}
        options={READING_TOPICS}
        onChange={(value) => setTopic(value as ReadingRequest["topic"])}
        open={activeSelect === "topic"}
        onOpenChange={(open) => setActiveSelect(open ? "topic" : null)}
        disabled={reading.busy}
      />
      <Dropdown
        label="Kho từ"
        value={deckId}
        options={[{ value: "", label: "Tất cả bộ thẻ tiếng Anh" }, ...decks.map((deck) => ({ value: deck.id, label: deck.name }))]}
        onChange={setDeckId}
        open={activeSelect === "deck"}
        onOpenChange={(open) => setActiveSelect(open ? "deck" : null)}
        disabled={reading.busy}
        searchable
      />
      {deckError && <Text style={styles.muted}>Chưa tải được danh sách bộ thẻ; bạn vẫn có thể đọc từ tất cả.</Text>}
      <Button title={reading.busy ? "Đang chuẩn bị bài đọc…" : lesson ? "Tạo bài khác" : "Bắt đầu đọc"} disabled={reading.busy} onPress={() => { setActiveSelect(null); void reading.generate({ topic, ...(deckId ? { deckId } : {}) }); }} />
      {!!reading.error && <View style={styles.card}><Text accessibilityRole="alert" style={styles.text}>{reading.error}</Text><Button title="Về kho từ" variant="secondary" onPress={() => router.navigate("/decks")} /></View>}
      <Text style={styles.muted}>Cần ít nhất 3 từ có nghĩa tiếng Việt. Đọc hiểu không thay đổi lịch ôn thẻ.</Text>
    </View>
    <View style={styles.card}><Text style={styles.heading}>Bài đọc đã lưu ({library.items.length}/20)</Text>{library.items.length > 0 && <Button title="Xóa tất cả bài đã lưu" variant="ghost" onPress={() => Alert.alert("Xóa tất cả bài đã lưu?", "Xóa bài đọc và câu trả lời trên thiết bị này. Không thể hoàn tác.", [{ text: "Hủy", style: "cancel" }, { text: "Xóa tất cả", style: "destructive", onPress: library.clear }])} />}<Text style={styles.muted}>Tự lưu trên thiết bị này theo tài khoản, gồm câu trả lời. Chọn bài để học tiếp; chưa đồng bộ thiết bị khác. Không tự hết hạn; quá 20 bài sẽ loại bài ít được học tiếp gần đây nhất.</Text>{!!library.error && <><Text style={styles.muted}>{library.error}</Text><Button title="Thử lại" variant="secondary" onPress={library.retry} /></>}{!library.ready && !library.error && <Text style={styles.muted}>Đang tải…</Text>}{library.ready && !library.items.length && <Text style={styles.muted}>Bài mới sẽ tự lưu sau khi tạo.</Text>}<ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>{library.items.map((item) => <View key={item.lesson.passage} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Button title={`${item.lesson.title} · ${item.answers.filter((a) => a !== null).length}/${item.lesson.questions.length} câu đã làm`} disabled={reading.busy} variant="secondary" onPress={() => reading.restore(item)} style={{ flex: 1 }} /><Pressable accessibilityRole="button" accessibilityLabel={`Xóa bài ${item.lesson.title}`} onPress={() => Alert.alert("Xóa bài đã lưu?", `Xóa “${item.lesson.title}” và câu trả lời? Không thể hoàn tác.`, [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: () => library.remove(item.lesson.passage) }])} style={{ padding: 12 }}><Text style={{ color: colors.danger }}>Xóa</Text></Pressable></View>)}</ScrollView></View>
    {lesson && <>
      <View style={styles.card}>
        <Text style={styles.title}>{lesson.title}</Text>
        {lesson.source === "examples" && <Text style={styles.muted}>Chưa tạo được đoạn đọc mới. Đây là các câu ví dụ đã lưu trong kho, không phải một câu chuyện liền mạch.</Text>}
        <ReadingAudio key={lesson.passage} text={lesson.passage}>
        <Text style={styles.passage}>{readingSegments(lesson.passage, lesson.words).map((segment, index) => segment.word ? <Text key={index} accessibilityRole="button" onPress={() => reading.setSelectedWord(segment.word!)} style={{ color: colors.brand, fontWeight: "700", textDecorationLine: "underline" }}>{segment.text}</Text> : segment.text)}</Text>
        </ReadingAudio>
      </View>
      <View style={styles.chips}>{lesson.words.map((w) => <Pressable key={w.id} accessibilityRole="button" onPress={() => reading.setSelectedWord(w)} style={styles.chip}><Text style={styles.text}>{w.term}</Text></Pressable>)}</View>
      <Modal open={!!reading.selectedWord} onClose={() => reading.setSelectedWord(null)} title={reading.selectedWord?.term} bodyDrag={false}>
        {reading.selectedWord && <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={{ gap: 12 }}><Text style={styles.text}>{reading.selectedWord.meaning}</Text><AudioButton url={reading.selectedWord.audio} text={reading.selectedWord.term} label="US" /><CardPhoto image={reading.selectedWord.image} /></ScrollView>}
        <Button title="Đóng" variant="secondary" onPress={() => reading.setSelectedWord(null)} />
      </Modal>
      {lesson.questions.map((q, index) => <View key={`${lesson.passage}-${index}`} style={styles.card}>
        <Text style={styles.heading}>{index + 1}. {q.prompt}</Text>
        {q.options.map((option, i) => <Pressable key={i} accessibilityRole="button" disabled={reading.answers[index] !== null} onPress={() => reading.answer(index, i)} style={[styles.chip, reading.answers[index] !== null && i === q.answerIndex ? { borderColor: colors.success } : reading.answers[index] === i ? { borderColor: colors.danger } : null]}><Text style={styles.text}>{option}</Text></Pressable>)}
        {reading.answers[index] !== null && <Text accessibilityLiveRegion="polite" style={styles.muted}>{reading.answers[index] === q.answerIndex ? "Chính xác! " : `Đáp án: ${q.options[q.answerIndex]}. `}{q.explanation}</Text>}
      </View>)}
      {reading.finished && <Text style={styles.heading}>Bạn đã trả lời đúng {reading.score}/{lesson.questions.length} câu. Đọc lại và nghe những từ bạn muốn nhớ chắc hơn nhé.</Text>}
    </>}
  </ScrollView>;
}
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 16, paddingBottom: 48, gap: 16 },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text }, heading: { fontSize: 16, fontWeight: "600", color: colors.text },
  text: { fontSize: 15, color: colors.text }, muted: { fontSize: 13, lineHeight: 20, color: colors.textMuted },
  passage: { fontSize: 18, lineHeight: 32, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 },
  active: { borderColor: colors.brand, backgroundColor: colors.brandLight },
});
