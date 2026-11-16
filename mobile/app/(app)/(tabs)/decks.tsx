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
import { exportAccountBackup } from "@/lib/export";
import { emptyStats } from "@/lib/queue";
import { useSettings } from "@/lib/settings";
import { DeckCard } from "@/components/deck/DeckCard";
import { DeckForm } from "@/components/deck/DeckForm";
import { StatusBar } from "@/components/status/StatusBar";
import { EnrichBackfillButton } from "@/components/EnrichBackfillButton";
import { Button } from "@/components/ui/Button";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import { Save } from "lucide-react-native";

export default function DecksScreen() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  /** Thống kê toàn tài khoản — tính một lần cho cả kho, xem fetchDecksWithStats. */
  const [account, setAccount] = useState<DeckStats | null>(null);
  const { settings, ready: settingsReady } = useSettings();

  async function handleBackup() {
    setBackupBusy(true);
    try {
      await exportAccountBackup();
    } catch (e) {
      Alert.alert("Lỗi sao lưu", (e as Error).message);
    } finally {
      setBackupBusy(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setError(null);
      const deckData = await fetchDecksWithStats(settings.newPerDay);
      setDecks(deckData.decks);
      setAccount(deckData.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [settings.newPerDay]);

  // Tải lại mỗi khi màn được focus (vd quay lại từ deck detail). Chờ cài đặt
  // (hạn mức từ mới) nạp xong để không phải đếm hàng đợi hai lần.
  useFocusEffect(
    useCallback(() => {
      if (!settingsReady) return;
      load();
    }, [load, settingsReady])
  );

  const agg = useMemo<DeckStats>(
    () =>
      account ?? emptyStats(),
    [account]
  );

  function handleDelete(deck: Deck) {
    Alert.alert(
      "Xóa bộ thẻ",
      `Xóa "${deck.name}"? Toàn bộ ${deck.card_count ?? 0} từ sẽ vào thùng rác — phục hồi được trong 30 ngày trên bản web.`,
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
            <Text style={styles.intro}>Quản lý bộ từ vựng, thêm từ và chọn bộ muốn học.</Text>
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
            <EnrichBackfillButton banner onDone={load} />
            {decks.length > 0 && (
                <Button
                  title="Sao lưu tài khoản (JSON)"
                  icon={<Save size={18} color={colors.text} />}
                  variant="ghost"
                  onPress={handleBackup}
                  loading={backupBusy}
                  style={styles.backupBtn}
                />
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
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    statAccent: { color: colors.tints.amber.fg },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
    header: { marginBottom: spacing.md },
    intro: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
    backupBtn: { marginTop: spacing.sm },
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
