import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { CardStatus, CardWithProgress } from "@/types";
import { fetchCardsWithProgress, recordProgress } from "@/lib/cards";
import { FlashcardFlip } from "@/components/flashcard/FlashcardFlip";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing } from "@/lib/theme";

/** Ưu tiên thẻ "hard" rồi "new", sau đó "good", cuối cùng "easy". */
function orderCards(cards: CardWithProgress[]): CardWithProgress[] {
  const weight = (c: CardWithProgress) => {
    const s = c.progress?.status ?? "new";
    if (s === "hard") return 0;
    if (s === "new") return 1;
    if (s === "good") return 2;
    return 3; // easy
  };
  return [...cards].sort((a, b) => weight(a) - weight(b));
}

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const [cards, setCards] = useState<CardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!deckId) return;
    fetchCardsWithProgress(deckId)
      .then((data) => setCards(orderCards(data)))
      .finally(() => setLoading(false));
  }, [deckId]);

  const current = cards[index];

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => {
      if (i + 1 >= cards.length) {
        setDone(true);
        return i;
      }
      return i + 1;
    });
  }, [cards.length]);

  const assess = useCallback(
    (status: CardStatus) => {
      if (!current) return;
      // optimistic: chuyển thẻ ngay, ghi DB nền (nuốt lỗi).
      void recordProgress(current.id, status).catch(() => {});
      next();
    },
    [current, next]
  );

  function restart() {
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }

  if (loading) {
    return (
      <Screen title="Học">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (cards.length === 0) {
    return (
      <Screen title="Học">
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Bộ thẻ này chưa có từ nào.</Text>
          <Button
            title="← Quay lại"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen title="Hoàn thành">
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Hoàn thành phiên học!</Text>
          <Text style={styles.doneSub}>Bạn đã ôn {cards.length} từ.</Text>
          <View style={styles.doneActions}>
            <Button title="Học lại" onPress={restart} style={styles.grow} />
            <Button
              title="Về bộ thẻ"
              variant="secondary"
              onPress={() => router.back()}
              style={styles.grow}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const progressPct = Math.round((index / cards.length) * 100);

  return (
    <Screen title="Học">
      <View style={styles.body}>
        {/* Tiến độ */}
        <Text style={styles.progressLabel}>
          Đang học: {index + 1}/{cards.length} từ
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.cardWrap}>
          <FlashcardFlip
            card={current}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
          />
        </View>

        {/* Đánh giá — chỉ hiện sau khi lật */}
        {flipped ? (
          <View style={styles.assessRow}>
            <Button
              title="Chưa thuộc"
              onPress={() => assess("hard")}
              style={[styles.grow, { backgroundColor: colors.danger }]}
            />
            <Button
              title="Tạm nhớ"
              onPress={() => assess("good")}
              style={[styles.grow, { backgroundColor: "#f59e0b" }]}
            />
            <Button
              title="Đã thuộc"
              onPress={() => assess("easy")}
              style={[styles.grow, { backgroundColor: colors.success }]}
            />
          </View>
        ) : (
          <Button
            title="Hiện đáp án"
            variant="secondary"
            onPress={() => setFlipped(true)}
          />
        )}
      </View>
    </Screen>
  );
}

/** Bọc tiêu đề header + nền cho mọi trạng thái. */
function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  progressLabel: { fontSize: 14, color: colors.textMuted },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brand },
  cardWrap: { flex: 1, justifyContent: "center" },
  assessRow: { flexDirection: "row", gap: spacing.sm },
  grow: { flex: 1 },
  emptyTitle: { fontSize: 16, color: colors.textMuted },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  doneSub: { fontSize: 15, color: colors.textMuted },
  doneActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
});
