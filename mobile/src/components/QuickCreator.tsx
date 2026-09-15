import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Deck, DraftCard } from "@/types";
import { lookupWord } from "@/lib/api";
import { saveCard } from "@/lib/cards";
import { fetchDecks } from "@/lib/decks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DraftEditor } from "@/components/flashcard/DraftEditor";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles } from "@/contexts/ThemeContext";

interface Props {
  /**
   * Deck cố định để lưu thẻ vào (khi mở từ trang chi tiết deck). Bỏ trống thì
   * hiện ô chọn bộ thẻ — luồng "chia sẻ từ ngoài vào" không biết deck nào.
   */
  deckId?: string;
  /** Gọi sau khi lưu thành công (để reload danh sách). */
  onSaved?: () => void;
  /**
   * Từ điền sẵn vào ô nhập, và tra luôn khi modal mở (luồng chia sẻ từ ngoài
   * app vào — xem `app/(app)/share.tsx`).
   */
  initialWord?: string;
  /** Mở modal ngay khi mount, không chờ bấm nút "+". */
  autoOpen?: boolean;
  /** Ẩn nút "+" — màn chia sẻ đã tự mở modal nên FAB chỉ gây rối. */
  hideFab?: boolean;
  /** Gọi khi người dùng đóng modal (màn chia sẻ dùng để quay về trang chủ). */
  onClose?: () => void;
}

/** FAB "+" + modal tạo thẻ nhanh: gõ từ → tra → sửa → lưu. */
export function QuickCreator({
  deckId,
  onSaved,
  initialWord,
  autoOpen,
  hideFab,
  onClose,
}: Props) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(!!autoOpen);
  const [word, setWord] = useState(initialWord ?? "");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [targetDeckId, setTargetDeckId] = useState(deckId ?? "");
  const [error, setError] = useState<string | null>(null);
  /** Chỉ tra tự động MỘT lần cho `initialWord` — không thì mỗi render là một
   *  lượt tra, ăn hết hạn mức 30 lượt/phút trong vài giây. */
  const autoLookedRef = useRef(false);

  // Không truyền sẵn deck thì phải tự nạp danh sách để người dùng chọn.
  useEffect(() => {
    if (!open || deckId) return;
    fetchDecks()
      .then((d) => {
        setDecks(d);
        setTargetDeckId((cur) => cur || d[0]?.id || "");
      })
      .catch(() => {});
  }, [open, deckId]);

  // Từ được chia sẻ từ ngoài vào: tra ngay, người dùng chỉ còn việc bấm Lưu.
  useEffect(() => {
    if (!open || autoLookedRef.current) return;
    if (!initialWord?.trim()) return;
    autoLookedRef.current = true;
    void handleLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialWord]);

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
    if (!draft || !targetDeckId) return;
    setSaving(true);
    setError(null);
    try {
      await saveCard(targetDeckId, draft);
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
    onClose?.();
  }

  return (
    <>
      {!hideFab && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setOpen(true)}
          accessibilityLabel="Thêm từ mới"
        >
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      )}

      {/* bodyDrag=false: tránh vuốt trúng lúc đang gõ làm mất bản nháp. */}
      <Modal open={open} onClose={close} title="Thêm từ mới" bodyDrag={false}>
        <View style={styles.lookupRow}>
          <Input
            value={word}
            onChangeText={setWord}
            placeholder="Gõ từ tiếng Anh..."
            autoCapitalize="none"
            autoFocus={!initialWord}
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

        {!deckId && (
          <View style={styles.deckPick}>
            <Text style={styles.deckLabel}>Lưu vào bộ thẻ</Text>
            {decks.length === 0 ? (
              <Text style={styles.warn}>
                Chưa có bộ thẻ nào — hãy tạo một bộ ở trang chủ trước.
              </Text>
            ) : (
              <View style={styles.deckChips}>
                {decks.map((d) => {
                  const active = d.id === targetDeckId;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => setTargetDeckId(d.id)}
                      style={[styles.deckChip, active && styles.deckChipOn]}
                    >
                      <Text
                        style={[
                          styles.deckChipText,
                          active && styles.deckChipTextOn,
                        ]}
                        numberOfLines={1}
                      >
                        {d.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

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
                disabled={!targetDeckId}
                style={styles.flex}
              />
            </View>
          </>
        )}
      </Modal>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    warn: { color: colors.tints.amber.fg, fontSize: 13 },
    deckPick: { gap: spacing.xs },
    deckLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    deckChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    deckChip: {
      maxWidth: "100%",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    deckChipOn: { borderColor: colors.brand, backgroundColor: colors.brandLight },
    deckChipText: { color: colors.textMuted, fontSize: 13 },
    deckChipTextOn: { color: colors.brandDark, fontWeight: "700" },
    draftScroll: { maxHeight: Dimensions.get("window").height * 0.5 },
    draftContent: { paddingVertical: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.md },
  });
