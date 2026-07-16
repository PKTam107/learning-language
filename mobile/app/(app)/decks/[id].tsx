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
import type { Card, CardStatus, CardWithProgress, Deck } from "@/types";
import {
  fetchCardsWithProgress,
  fetchDeck,
  deleteCard,
  deleteCards,
  moveCards,
  resetProgress,
  importCards,
} from "@/lib/cards";
import { fetchDecks } from "@/lib/decks";
import { pickAndParseXlsx } from "@/lib/import/xlsx";
import { exportCards, type ExportFormat } from "@/lib/export";
import {
  STATUS_META,
  STATUS_ORDER,
  computeStats,
  masteredPercent,
} from "@/lib/status";
import { CardRow } from "@/components/card/CardRow";
import { StatusBar } from "@/components/status/StatusBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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

  // Chọn nhiều thẻ (hành động hàng loạt)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [importing, setImporting] = useState(false);

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

  async function handleImport() {
    if (!deck) return;
    setImporting(true);
    try {
      const drafts = await pickAndParseXlsx();
      if (!drafts) return; // người dùng hủy chọn
      if (drafts.length === 0) {
        Alert.alert("Nhập Excel", "Không đọc được từ nào trong file.");
        return;
      }
      const { inserted, skipped } = await importCards(deck.id, drafts);
      await load();
      Alert.alert(
        "Nhập Excel",
        `Đã thêm ${inserted} từ${
          skipped > 0 ? ` · bỏ qua ${skipped} từ trùng` : ""
        }.`
      );
    } catch (e) {
      Alert.alert("Lỗi", (e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    if (!deck || cards.length === 0) return;
    const run = async (format: ExportFormat) => {
      try {
        await exportCards(cards, format, deck.name);
      } catch (e) {
        Alert.alert("Lỗi", (e as Error).message);
      }
    };
    Alert.alert("Xuất bộ thẻ", "Chọn định dạng", [
      { text: "CSV", onPress: () => run("csv") },
      { text: "Excel", onPress: () => run("xlsx") },
      { text: "JSON", onPress: () => run("json") },
      { text: "Hủy", style: "cancel" },
    ]);
  }

  // ----- Chọn nhiều thẻ -----
  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelect(card: Card) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((c) => c.id))
    );
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    Alert.alert("Xóa thẻ", `Xóa ${ids.length} từ đã chọn?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setBulkBusy(true);
          try {
            await deleteCards(ids);
            setSelected(new Set());
            await load();
          } catch (e) {
            Alert.alert("Lỗi", (e as Error).message);
          } finally {
            setBulkBusy(false);
          }
        },
      },
    ]);
  }

  function handleBulkReset() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    Alert.alert("Reset tiến độ", `Reset ${ids.length} từ về "chưa học"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          setBulkBusy(true);
          try {
            await resetProgress(ids);
            setSelected(new Set());
            await load();
          } catch (e) {
            Alert.alert("Lỗi", (e as Error).message);
          } finally {
            setBulkBusy(false);
          }
        },
      },
    ]);
  }

  async function openBulkMove() {
    if (selected.size === 0) return;
    try {
      const all = await fetchDecks();
      setDecks(all.filter((d) => d.id !== id));
    } catch {
      setDecks([]);
    }
    setBulkMoveOpen(true);
  }

  async function doBulkMove(targetDeckId: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const { moved, skipped } = await moveCards(ids, targetDeckId);
      setBulkMoveOpen(false);
      setSelected(new Set());
      await load();
      if (skipped > 0) {
        Alert.alert(
          "Đã chuyển",
          `Đã chuyển ${moved} từ. Bỏ qua ${skipped} từ vì trùng ở bộ thẻ đích.`
        );
      }
    } catch (e) {
      Alert.alert("Lỗi", (e as Error).message);
    } finally {
      setBulkBusy(false);
    }
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

        <View style={styles.headerBtns}>
          <Button
            title="⬆️ Nhập Excel"
            variant="secondary"
            onPress={handleImport}
            loading={importing}
            style={styles.flexBtn}
          />
        </View>

        {cards.length > 0 && (
          <>
            <View style={styles.barWrap}>
              <StatusBar stats={stats} />
            </View>

            <View style={styles.headerBtns}>
              <Button
                title="Học ngay"
                onPress={() => router.push(`/study/${deck.id}`)}
                style={styles.flexBtn}
              />
              <Button
                title={selectMode ? "Xong" : "Chọn"}
                variant="secondary"
                onPress={toggleSelectMode}
                style={styles.flexBtn}
              />
            </View>

            <View style={styles.headerBtns}>
              <Button
                title="⬇️ Xuất (CSV/Excel/JSON)"
                variant="ghost"
                onPress={handleExport}
                style={styles.flexBtn}
              />
            </View>

            {selectMode && (
              <View style={styles.bulkBar}>
                <Pressable onPress={toggleSelectAll}>
                  <Text style={styles.bulkLink}>
                    {selected.size === filtered.length && filtered.length > 0
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </Text>
                </Pressable>
                <Text style={styles.bulkCount}>Đã chọn {selected.size}</Text>
                <View style={styles.bulkActions}>
                  <Pressable
                    onPress={openBulkMove}
                    disabled={selected.size === 0 || bulkBusy}
                    style={[
                      styles.bulkBtn,
                      (selected.size === 0 || bulkBusy) && styles.bulkBtnDim,
                    ]}
                  >
                    <Text style={styles.bulkBtnText}>Chuyển</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleBulkReset}
                    disabled={selected.size === 0 || bulkBusy}
                    style={[
                      styles.bulkBtn,
                      (selected.size === 0 || bulkBusy) && styles.bulkBtnDim,
                    ]}
                  >
                    <Text style={styles.bulkBtnText}>Reset</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleBulkDelete}
                    disabled={selected.size === 0 || bulkBusy}
                    style={[
                      styles.bulkBtn,
                      styles.bulkBtnDanger,
                      (selected.size === 0 || bulkBusy) && styles.bulkBtnDim,
                    ]}
                  >
                    <Text style={styles.bulkBtnDangerText}>Xóa</Text>
                  </Pressable>
                </View>
              </View>
            )}

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
          <CardRow
            card={item}
            status={statusOf(item)}
            onDelete={handleDelete}
            selectMode={selectMode}
            selected={selected.has(item.id)}
            onToggleSelect={toggleSelect}
          />
        )}
      />

      <Modal
        open={bulkMoveOpen}
        onClose={() => setBulkMoveOpen(false)}
        title={`Chuyển ${selected.size} thẻ sang bộ khác`}
      >
        {decks.length === 0 ? (
          <Text style={styles.emptyText}>
            Bạn chưa có bộ thẻ nào khác để chuyển tới.
          </Text>
        ) : (
          <View style={styles.moveList}>
            {decks.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => doBulkMove(d.id)}
                disabled={bulkBusy}
                style={({ pressed }) => [
                  styles.moveItem,
                  pressed && styles.moveItemPressed,
                ]}
              >
                <Text style={styles.moveItemText}>{d.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={styles.moveHint}>
          Những từ đã tồn tại (trùng) ở bộ thẻ đích sẽ được bỏ qua.
        </Text>
      </Modal>

      {!selectMode && <QuickCreator deckId={deck.id} onSaved={load} />}
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
  headerBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  flexBtn: { flex: 1 },
  bulkBar: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
    gap: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  bulkLink: { color: colors.brandDark, fontWeight: "600", fontSize: 13 },
  bulkCount: { color: colors.textMuted, fontSize: 13 },
  bulkActions: { flexDirection: "row", gap: spacing.sm, marginLeft: "auto" },
  bulkBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkBtnDim: { opacity: 0.4 },
  bulkBtnText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  bulkBtnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  bulkBtnDangerText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  moveList: { gap: spacing.sm },
  moveItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  moveItemPressed: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  moveItemText: { fontSize: 15, color: colors.text, fontWeight: "600" },
  moveHint: { fontSize: 12, color: colors.textSubtle, marginTop: spacing.sm },
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
