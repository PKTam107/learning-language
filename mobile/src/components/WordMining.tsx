import { useState } from "react";
import { Text, View, Switch } from "react-native";
import { useMining, type MiningServices } from "@/hooks/useMining";
import { fetchDecks } from "@/lib/decks";
import { fetchLearningCards } from "@/lib/learning";
import { saveCard } from "@/lib/cards";
import { lookupWord } from "@/lib/api";
import { MINING_BATCH, MINING_MAX_TEXT } from "@/lib/mining";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { useThemeColors } from "@/contexts/ThemeContext";
const services: MiningServices = {
  async load() { const [decks, cards] = await Promise.all([fetchDecks(), fetchLearningCards()]); return { decks, cards }; },
  lookup: lookupWord, save: saveCard,
};
export function WordMining({ initialText = "" }: { initialText?: string }) {
  const colors = useThemeColors();
  const mining = useMining(services, initialText);
  const [level, setLevel] = useState("");
  const [onlyNew, setOnlyNew] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const visible = mining.words.filter((word) => (!level || (word.level ?? "unknown") === level) && (!onlyNew || !mining.known.has(word.term)));
  return <View style={{ gap: 16 }}><Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Thêm từ từ đoạn văn</Text><Text style={{ color: colors.textMuted }}>Chọn tối đa {MINING_BATCH} từ mỗi lượt, trong tối đa 200 từ khác nhau. Chỉ tra khi bấm nút, khớp từ trong kho theo cách viết.</Text>
    <Input accessibilityLabel="Đoạn văn tiếng Anh" placeholder="Dán đoạn tiếng Anh…" multiline style={{ minHeight: 140, textAlignVertical: "top" }} maxLength={MINING_MAX_TEXT} value={mining.text} editable={!mining.busy} onChangeText={mining.changeText} />
    {!!mining.error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{mining.error}</Text>}
    {!mining.ready ? <Button title="Tải lại kho từ" onPress={() => void mining.load()} /> : !mining.decks.length ? <Text style={{ color: colors.text }}>Hãy tạo bộ thẻ EN → VI trước khi lưu từ.</Text> : <>
      <Button title="Cập nhật từ đã có trong kho" variant="secondary" disabled={mining.busy} onPress={() => void mining.load()} />
      <Dropdown label="Lưu vào bộ" value={mining.deckId} options={mining.decks.map((deck) => ({ value: deck.id, label: deck.name }))} onChange={(value) => { mining.setDeckId(value); setOpen(null); }} disabled={mining.busy} open={open === "deck"} onOpenChange={(value) => setOpen(value ? "deck" : null)} searchable />
      <Dropdown label="Cấp độ CEFR" value={level} options={[{ value: "", label: "Tất cả" }, ...["A1", "A2", "B1", "B2", "C1", "C2"].map((value) => ({ value, label: value })), { value: "unknown", label: "Chưa rõ" }]} onChange={(value) => { setLevel(value); setOpen(null); }} open={open === "level"} onOpenChange={(value) => setOpen(value ? "level" : null)} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Switch accessibilityLabel="Chỉ từ chưa có trong kho" value={onlyNew} onValueChange={setOnlyNew} /><Text style={{ color: colors.text }}>Chỉ từ chưa có trong kho</Text></View>
      {visible.map((word) => <Button key={word.term} title={`${mining.selected.includes(word.term) ? "✓ " : ""}${word.term} · ${word.level ?? "?"} · ${word.count}×${mining.known.has(word.term) ? mining.inDeck.has(word.term) ? " · đã có trong bộ" : " · đã có ở bộ khác" : ""}`} variant={mining.selected.includes(word.term) ? "primary" : "secondary"} disabled={mining.busy || (mining.inDeck.has(word.term) && !mining.selected.includes(word.term)) || (!mining.selected.includes(word.term) && mining.selected.length >= MINING_BATCH)} onPress={() => mining.toggle(word.term)} />)}
      {!!mining.text.trim() && !visible.length && <Text style={{ color: colors.textMuted }}>Không có từ phù hợp bộ lọc.</Text>}
      <Text style={{ color: colors.text }}>Đã chọn: {mining.selected.join(", ") || "chưa có"}</Text>
      <Button title="Tra từ đã chọn / thử lại" loading={mining.busy} disabled={!mining.selected.length} onPress={() => void mining.lookup()} />
      {mining.selected.map((term) => mining.drafts[term] && <View key={term} pointerEvents={mining.busy ? "none" : "auto"} style={{ padding: 16, borderWidth: 1, borderRadius: 12, borderColor: colors.border, gap: 12 }}><Text style={{ color: colors.text, fontWeight: "700" }}>{term} — {mining.drafts[term].meaningVi || "Nhập nghĩa thủ công"}</Text><DraftEditor draft={mining.drafts[term]} onChange={(draft) => mining.setDrafts((items) => ({ ...items, [term]: draft }))} /></View>)}
      <Button title={`Lưu ${mining.savable.length} thẻ đã xem có nghĩa`} disabled={mining.busy || !mining.savable.length} onPress={() => void mining.save()} />
    </>}
    {!!mining.message && <Text accessibilityLiveRegion="polite" style={{ color: colors.success }}>{mining.message}</Text>}<Text style={{ color: colors.textMuted }}>CEFR là mức tham khảo. Nội dung đang soạn chỉ giữ trong màn hình này; rời màn sẽ mất các thẻ chưa lưu.</Text>
  </View>;
}
