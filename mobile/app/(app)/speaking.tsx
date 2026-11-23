import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { fetchLearningCards, type LearningCard } from "@/lib/learning";
import { fetchDecks } from "@/lib/decks";
import { dictationSentences } from "@/lib/dictation";
import { SavedRecordings } from "@/components/SavedRecordings";
import { ShadowingPractice } from "@/components/ShadowingExercise";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/contexts/ThemeContext";
import type { Deck } from "@/types";
export default function SpeakingScreen() {
  const colors = useThemeColors();
  const [cards, setCards] = useState<LearningCard[] | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let alive = true; setError(""); setCards(null);
    Promise.all([fetchLearningCards(), fetchDecks()]).then(([rows, list]) => { if (alive) { setCards(rows); setDecks(list); } }).catch(() => { if (alive) setError("Chưa tải được kho từ. Kiểm tra kết nối rồi thử lại."); });
    return () => { alive = false; };
  }, [reload]));
  const sentences = useMemo(() => dictationSentences((cards ?? []).filter((card) => !deckId || card.deck_id === deckId)), [cards, deckId]);
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
    <Text style={{ color: colors.textMuted }}>Luyện bằng câu ví dụ trong kho thẻ, không cần tạo bài bằng AI. Giọng đọc tùy thiết bị.</Text>
    <Dropdown label="Bộ thẻ" value={deckId} onChange={(value) => { setDeckId(value); setOpen(false); }} options={[{ value: "", label: "Tất cả bộ thẻ tiếng Anh" }, ...decks.filter((deck) => deck.source_language === "en").map((deck) => ({ value: deck.id, label: deck.name }))]} open={open} onOpenChange={setOpen} searchable />
    {error ? <><Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text><Button title="Thử lại" onPress={() => setReload(reload + 1)} /></> : !cards ? <Text style={{ color: colors.text }}>Đang tải câu ví dụ…</Text> : <ShadowingPractice key={`${deckId}-${reload}`} sentences={sentences} />}
    <SavedRecordings />
  </ScrollView>;
}
