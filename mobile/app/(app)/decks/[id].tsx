import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import type { CardStatus, CardWithProgress, Deck } from "@/types";
import { fetchCardsWithProgress, fetchDeck, deleteCard } from "@/lib/cards";
import {
  STATUS_META,
  STATUS_ORDER,
  computeStats,
  masteredPercent,
} from "@/lib/status";
import { CardRow } from "@/components/card/CardRow";
import { StatusBar } from "@/components/status/StatusBar";
import { Button } from "@/components/ui/Button";
import { QuickCreator } from "@/components/QuickCreator";
import { colors, radius, spacing } from "@/lib/theme";

const statusOf = (c: CardWithProgress): CardStatus => c.progress?.status ?? "new";

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CardStatus | "all">("all");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [deckData, cardData] = await Promise.all([
        fetchDeck(id),
        fetchCardsWithProgress(id),
      ]);
      setDeck(deckData);
      setCards(cardData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(() => computeStats(cards), [cards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (statusFilter !== "all" && statusOf(c) !== statusFilter) return false;
      if (!q) return true;
      return (
        c.term.toLowerCase().includes(q) ||
        (c.meaning_vi ?? "").toLowerCase().includes(q) ||
        (c.phonetic ?? "").toLowerCase().includes(q)
      );
    });
  }, [cards, query, statusFilter]);

  function handleDelete(card: { id: string; term: string }) {
    Alert.alert("Xóa từ", `Xóa từ "${card.term}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCard(card.id);
            load();
          } catch (e) {
            Alert.alert("Lỗi", (e as Error).message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Không tìm thấy bộ thẻ.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: deck.name }} />

      <View style={styles.header}>
        <Text style={styles.title}>{deck.name}</Text>
        {!!deck.description && <Text style={styles.desc}>{deck.description}</Text>}
        <Text style={styles.count}>
          {cards.length} từ
          {cards.length > 0 && ` · ${masteredPercent(stats)}% đã thuộc`}
          {stats.due > 0 && (
            <Text style={styles.due}> · {stats.due} cần ôn</Text>
          )}
        </Text>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {cards.length > 0 && (
          <>
            <View style={styles.barWrap}>
              <StatusBar stats={stats} />
            </View>

            <Button
              title="Học ngay"
              onPress={() => router.push(`/study/${deck.id}`)}
              style={styles.studyBtn}
            />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm theo từ, nghĩa hoặc phiên âm..."
              placeholderTextColor={colors.textSubtle}
              style={styles.search}
            />

            <View style={styles.chipRow}>
              <FilterChip
                label={`Tất cả ${cards.length}`}
                active={statusFilter === "all"}
                onPress={() => setStatusFilter("all")}
              />
              {STATUS_ORDER.map((s) => (
                <FilterChip
                  key={s}
                  label={`${STATUS_META[s].label} ${stats.byStatus[s]}`}
                  color={STATUS_META[s].color}
                  active={statusFilter === s}
                  disabled={stats.byStatus[s] === 0}
                  onPress={() => setStatusFilter(s)}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          cards.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Chưa có từ nào.</Text>
              <Text style={styles.emptyText}>
                Bấm nút ＋ góc dưới phải để tra và thêm từ.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Không có từ nào khớp bộ lọc hiện tại.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CardRow card={item} status={statusOf(item)} onDelete={handleDelete} />
        )}
      />

      <QuickCreator deckId={deck.id} onSaved={load} />
    </View>
  );
}

function FilterChip({
  label,
  color,
  active,
  disabled,
  onPress,
}: {
  label: string;
  color?: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        active && styles.chipActive,
        disabled && styles.chipDisabled,
      ]}
    >
      {!!color && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  notFound: { color: colors.textMuted, fontSize: 16 },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  desc: { fontSize: 14, color: colors.textMuted },
  count: { fontSize: 14, color: colors.textSubtle },
  due: { color: "#d97706" }, // amber-600
  error: { color: colors.danger, fontSize: 14 },
  barWrap: { marginTop: spacing.sm },
  studyBtn: { marginTop: spacing.md },
  search: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  chipRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  chipDisabled: { opacity: 0.4 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.brandDark, fontWeight: "600" },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 96, flexGrow: 1 },
  sep: { height: spacing.md },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted },
  emptyText: {
    marginTop: spacing.xs,
    textAlign: "center",
    color: colors.textSubtle,
    lineHeight: 20,
  },
});
