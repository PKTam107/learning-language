import { useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DraftCard } from "@/types";
import { lookupWord } from "@/lib/api";
import { saveCard } from "@/lib/cards";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { colors, radius, spacing } from "@/lib/theme";

interface Props {
  /** Deck để lưu thẻ vào. */
  deckId: string;
  /** Gọi sau khi lưu thành công (để reload danh sách). */
  onSaved?: () => void;
}

/** FAB "+" + modal tạo thẻ nhanh: gõ từ → tra → sửa → lưu. */
export function QuickCreator({ deckId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    if (!word.trim()) return;
    setLooking(true);
    setError(null);
    setDraft(null);
    try {
      const data = await lookupWord(word.trim());
      setDraft(data);
      if (data.notFound) {
        setError(
          data.meaningVi
            ? "Không có trong từ điển (cụm từ) — đã dịch sẵn nghĩa, bạn có thể chỉnh lại."
            : "Không tìm thấy từ trong từ điển — bạn có thể nhập nghĩa thủ công."
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLooking(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await saveCard(deckId, draft);
      // reset để gõ từ tiếp theo (giữ modal mở cho flow nhanh)
      setWord("");
      setDraft(null);
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setOpen(false);
    setWord("");
    setDraft(null);
    setError(null);
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Thêm từ mới"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <Modal open={open} onClose={close} title="Thêm từ mới">
        <View style={styles.lookupRow}>
          <Input
            value={word}
            onChangeText={setWord}
            placeholder="Gõ từ tiếng Anh..."
            autoCapitalize="none"
            autoFocus
            onSubmitEditing={handleLookup}
            returnKeyType="search"
            style={styles.flex}
          />
          <Button
            title="Tra từ"
            onPress={handleLookup}
            loading={looking}
            disabled={!word.trim()}
          />
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        {draft && (
          <>
            <ScrollView
              style={styles.draftScroll}
              contentContainerStyle={styles.draftContent}
              keyboardShouldPersistTaps="handled"
            >
              <DraftEditor draft={draft} onChange={setDraft} />
            </ScrollView>
            <View style={styles.actions}>
              <Button
                title="Hủy"
                variant="ghost"
                onPress={() => setDraft(null)}
                style={styles.flex}
              />
              <Button
                title="Lưu vào bộ thẻ"
                onPress={handleSave}
                loading={saving}
                style={styles.flex}
              />
            </View>
          </>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabPressed: { backgroundColor: colors.brandDark },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 34, fontWeight: "300" },
  lookupRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  flex: { flex: 1 },
  warn: { color: "#b45309", fontSize: 13 },
  draftScroll: { maxHeight: Dimensions.get("window").height * 0.5 },
  draftContent: { paddingVertical: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.md },
});
