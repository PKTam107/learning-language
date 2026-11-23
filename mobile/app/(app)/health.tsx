import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { fetchLearningCards, type LearningCard } from "@/lib/learning";
import { cardToDraft, updateCard } from "@/lib/cards";
import { fetchDecks } from "@/lib/decks";
import { analyzeHealth, HEALTH_LABELS, type HealthIssue } from "@/lib/learning-insights";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { useThemeColors } from "@/contexts/ThemeContext";
import type { Deck, DraftCard } from "@/types";
export default function HealthScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [cards, setCards] = useState<LearningCard[] | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [filter, setFilter] = useState<HealthIssue | "">("");
  const [deckId, setDeckId] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<LearningCard | null>(null);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  useFocusEffect(useCallback(() => {
    let alive = true; setError("");
    Promise.all([fetchLearningCards(), fetchDecks()]).then(([rows, list]) => { if (alive) { setCards(rows); setDecks(list); } }).catch(() => { if (alive) setError("Chưa kiểm tra được kho thẻ. Hãy thử lại."); });
    return () => { alive = false; };
  }, [reload]));
  const issues = useMemo(() => analyzeHealth(cards ?? []), [cards]);
  const filtered = issues.filter((item) => (!filter || item.issues.includes(filter)) && (!deckId || item.card.deck_id === deckId));
  async function save() {
    if (!editing || !draft || saving) return;
    setSaving(true); setSaveError("");
    try { await updateCard(editing.id, editing.deck_id, draft); setCards(await fetchLearningCards()); setEditing(null); setDraft(null); }
    catch { setSaveError("Chưa hoàn tất lưu và tải lại. Hãy kiểm tra kết nối rồi thử lại."); }
    finally { setSaving(false); }
  }
  return <><ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
    <Text style={{ color: colors.textMuted }}>Tìm và sửa thẻ thiếu dữ liệu. Trùng từ giữa các bộ chỉ là gợi ý kiểm tra; bạn có thể giữ cả hai.</Text>
    {!!error && <><Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text><Button title="Thử lại" onPress={() => setReload(reload + 1)} /></>}
    {!cards && !error && <Text style={{ color: colors.text }}>Đang kiểm tra…</Text>}
    {cards && <><Text style={{ color: colors.text }}>{issues.length}/{cards.length} thẻ cần xem lại.</Text>
      <Dropdown label="Vấn đề" value={filter} options={[{ value: "", label: `Tất cả (${issues.length})` }, ...Object.entries(HEALTH_LABELS).map(([value, label]) => ({ value, label: `${label} (${issues.filter((item) => item.issues.includes(value as HealthIssue)).length})` }))]} onChange={(value) => { setFilter(value as HealthIssue | ""); setOpen(null); setLimit(50); }} open={open === "issue"} onOpenChange={(value) => setOpen(value ? "issue" : null)} />
      <Dropdown label="Bộ thẻ" value={deckId} options={[{ value: "", label: "Tất cả bộ thẻ" }, ...decks.map((deck) => ({ value: deck.id, label: deck.name }))]} onChange={(value) => { setDeckId(value); setOpen(null); setLimit(50); }} open={open === "deck"} onOpenChange={(value) => setOpen(value ? "deck" : null)} searchable />
      {!filtered.length && <Text style={{ color: colors.textMuted }}>{cards.length ? "Không có thẻ cần xem lại trong bộ lọc này." : "Kho chưa có thẻ. Thêm từ vào bộ thẻ để bắt đầu."}</Text>}
      {filtered.slice(0, limit).map(({ card, issues }) => <View key={card.id} style={{ padding: 16, borderWidth: 1, borderRadius: 12, borderColor: colors.border, gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{card.term}</Text>
        <Text style={{ color: colors.textMuted }}>{decks.find((deck) => deck.id === card.deck_id)?.name}</Text>
        {issues.map((issue) => <Text key={issue} style={{ color: colors.tints.amber.fg }}>{HEALTH_LABELS[issue]}</Text>)}
        {issues.includes("leech") && <Text style={{ color: colors.textMuted }}>Thử rút gọn nghĩa, thêm câu ví dụ và ghi chú riêng. Sửa nội dung giữ nguyên tiến độ ôn.</Text>}
        <Button title="Sửa" onPress={() => { setEditing(card); setDraft(cardToDraft(card)); setSaveError(""); }} /><Button title="Mở bộ thẻ" variant="secondary" onPress={() => router.push(`/decks/${card.deck_id}`)} />
      </View>)}
      {filtered.length > limit && <Button title={`Xem thêm (${filtered.length - limit})`} variant="secondary" onPress={() => setLimit(limit + 50)} />}
    </>}
  </ScrollView><Modal open={!!editing} onClose={() => { if (!saving) { setEditing(null); setDraft(null); } }} title="Sửa thẻ" bodyDrag={false}>{draft && <View style={{ gap: 16 }}><View pointerEvents={saving ? "none" : "auto"}><DraftEditor draft={draft} onChange={setDraft} /></View>{!!saveError && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{saveError}</Text>}<Button title="Lưu thay đổi" loading={saving} onPress={() => void save()} /></View>}</Modal></>;
}
