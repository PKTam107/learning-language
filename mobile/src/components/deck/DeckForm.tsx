import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Deck } from "@/types";
import { createDeck, updateDeck } from "@/lib/decks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, spacing } from "@/lib/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Có deck = chế độ sửa. */
  deck?: Deck | null;
}

export function DeckForm({ open, onClose, onSaved, deck }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đồng bộ giá trị form mỗi khi mở (tạo mới hoặc sửa deck khác nhau).
  useEffect(() => {
    if (open) {
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
      setError(null);
    }
  }, [open, deck]);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (deck) {
        await updateDeck(deck.id, { name: name.trim(), description });
      } else {
        await createDeck({ name: name.trim(), description });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deck ? "Sửa bộ thẻ" : "Tạo bộ thẻ mới"}
    >
      <Input
        placeholder="Tên bộ thẻ (vd: TOEIC 900)"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <Input
        placeholder="Mô tả (tùy chọn)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={2}
        style={styles.textarea}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Button
          title="Hủy"
          variant="ghost"
          onPress={onClose}
          style={styles.flex}
        />
        <Button
          title={deck ? "Lưu" : "Tạo"}
          onPress={handleSubmit}
          loading={saving}
          disabled={!name.trim()}
          style={styles.flex}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  textarea: { minHeight: 64, textAlignVertical: "top" },
  error: { color: colors.danger, fontSize: 14 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  flex: { flex: 1 },
});
