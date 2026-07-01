import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import type { Card, Deck } from "@/types";
import { fetchCards, fetchDeck, deleteCard } from "@/lib/cards";
import { CardRow } from "@/components/card/CardRow";
import { Button } from "@/components/ui/Button";
import { QuickCreator } from "@/components/QuickCreator";
import { colors, spacing } from "@/lib/theme";

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [deckData, cardData] = await Promise.all([
        fetchDeck(id),
        fetchCards(id),
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

  function handleDelete(card: Card) {
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
      {/* Cập nhật tiêu đề header theo tên deck */}
      <Stack.Screen options={{ title: deck.name }} />

      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        // mỗi card là 1 thẻ trắng, cách nhau bằng khoảng trống
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{deck.name}</Text>
            {!!deck.description && (
              <Text style={styles.desc}>{deck.description}</Text>
            )}
            <Text style={styles.count}>{cards.length} từ</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {cards.length > 0 && (
              <Button
                title="Học ngay"
                onPress={() => router.push(`/study/${deck.id}`)}
                style={styles.studyBtn}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có từ nào.</Text>
            <Text style={styles.emptyText}>
              Bấm nút ＋ góc dưới phải để tra và thêm từ.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CardRow card={item} onDelete={handleDelete} />
        )}
      />

      <QuickCreator deckId={deck.id} onSaved={load} />
    </View>
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
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  header: { marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  desc: { marginTop: 2, fontSize: 14, color: colors.textMuted },
  count: { marginTop: spacing.xs, fontSize: 14, color: colors.textSubtle },
  error: { marginTop: spacing.sm, color: colors.danger, fontSize: 14 },
  studyBtn: { marginTop: spacing.md },
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
