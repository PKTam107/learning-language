import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Deck, DeckStats } from "@/types";
import { fetchDecksWithStats, deleteDeck } from "@/lib/decks";
import { STATUS_ORDER, emptyByStatus } from "@/lib/status";
import { DeckCard } from "@/components/deck/DeckCard";
import { DeckForm } from "@/components/deck/DeckForm";
import { StatusBar } from "@/components/status/StatusBar";
import { colors, radius, spacing } from "@/lib/theme";

export default function DecksScreen() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setDecks(await fetchDecksWithStats());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tải lại mỗi khi màn được focus (vd quay lại từ deck detail).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const agg = useMemo<DeckStats>(() => {
    const byStatus = emptyByStatus();
    let total = 0;
    let due = 0;
    for (const d of decks) {
      if (!d.stats) continue;
      total += d.stats.total;
      due += d.stats.due;
      for (const s of STATUS_ORDER) byStatus[s] += d.stats.byStatus[s];
    }
    return { total, byStatus, due };
  }, [decks]);

  function handleDelete(deck: Deck) {
    Alert.alert(
      "Xóa bộ thẻ",
      `Xóa "${deck.name}"? Toàn bộ ${deck.card_count ?? 0} từ trong bộ sẽ bị xóa.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDeck(deck.id);
              load();
            } catch (e) {
              Alert.alert("Lỗi", (e as Error).message);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={decks}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Bộ từ vựng của bạn</Text>
            {agg.total > 0 && (
              <View style={styles.statsCard}>
                <View style={styles.statsRow}>
                  <Stat label="Bộ thẻ" value={decks.length} />
                  <Stat label="Tổng từ" value={agg.total} />
                  <Stat label="Đã thuộc" value={agg.byStatus.easy} />
                  <Stat label="Cần ôn" value={agg.due} accent={agg.due > 0} />
                </View>
                <View style={styles.statsBar}>
                  <StatusBar stats={agg} />
                </View>
              </View>
            )}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có bộ thẻ nào.</Text>
            <Text style={styles.emptyText}>
              Tạo bộ thẻ đầu tiên, rồi thêm từ vào để bắt đầu học.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            onPress={(d) => router.push(`/decks/${d.id}`)}
            onEdit={(d) => {
              setEditing(d);
              setFormOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        accessibilityLabel="Tạo bộ thẻ"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <DeckForm
        open={formOpen}
        deck={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </View>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  statsCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statsBar: {},
  stat: { alignItems: "center", flex: 1 },
  statLabel: { fontSize: 11, color: colors.textSubtle, textTransform: "uppercase" },
  statValue: { marginTop: 2, fontSize: 20, fontWeight: "700", color: colors.text },
  statAccent: { color: "#d97706" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  header: { marginBottom: spacing.md },
  heading: { fontSize: 20, fontWeight: "700", color: colors.text },
  error: { marginTop: spacing.sm, color: colors.danger, fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.textMuted },
  emptyText: {
    marginTop: spacing.xs,
    textAlign: "center",
    color: colors.textSubtle,
    lineHeight: 20,
  },
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
});
