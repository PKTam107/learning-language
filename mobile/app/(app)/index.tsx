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
import { fetchStudyStats, EMPTY_STATS, type StudyStats } from "@/lib/stats";
import { fetchWeakWords, type WeakWord } from "@/lib/weak";
import { fetchChallengeMetrics } from "@/lib/insights";
import {
  buildDailyChallenge,
  type DailyChallenge as Challenge,
} from "@/lib/challenge";
import { STATUS_ORDER, emptyByStatus } from "@/lib/status";
import { DeckCard } from "@/components/deck/DeckCard";
import { DeckForm } from "@/components/deck/DeckForm";
import { StatusBar } from "@/components/status/StatusBar";
import { StreakCard } from "@/components/StreakCard";
import { DailyChallenge } from "@/components/DailyChallenge";
import { WeakWords } from "@/components/WeakWords";
import { EnrichBackfillButton } from "@/components/EnrichBackfillButton";
import { Button } from "@/components/ui/Button";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import { GraduationCap, PartyPopper, Save, TrendingUp } from "lucide-react-native";

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
  const [stats, setStats] = useState<StudyStats>(EMPTY_STATS);
  const [weak, setWeak] = useState<WeakWord[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

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
      const [deckData, statData, weakData, challengeMetrics] = await Promise.all([
        fetchDecksWithStats(),
        fetchStudyStats(),
        fetchWeakWords(8),
        fetchChallengeMetrics(),
      ]);
      setDecks(deckData);
      setStats(statData);
      setWeak(weakData);
      setChallenge(buildDailyChallenge(challengeMetrics));
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
            {/* Thứ tự có chủ ý: việc cần làm hôm nay lên trên hết, rồi mới tới
                các khối tham khảo (thử thách, hay quên, thống kê). Trước đây
                phải cuộn qua hết mấy khối đó mới tới chỗ bắt đầu học. */}
            {agg.due > 0 ? (
              <Pressable
                onPress={() => router.push("/study/today")}
                style={({ pressed }) => [
                  styles.todayCard,
                  pressed && styles.todayPressed,
                ]}
              >
                <View style={styles.todayIcon}>
                  <GraduationCap size={24} color="#fff" />
                </View>
                <View style={styles.todayBody}>
                  <Text style={styles.todayTitle}>
                    {agg.due} từ cần ôn hôm nay
                  </Text>
                  <Text style={styles.todaySub}>
                    Gộp tất cả bộ thẻ vào một phiên.
                  </Text>
                </View>
                <Text style={styles.todayCta}>Ôn ngay →</Text>
              </Pressable>
            ) : (
              stats.todayCount > 0 && (
                <View style={styles.doneCard}>
                  <PartyPopper size={18} color={colors.success} />
                  <Text style={styles.doneText}>
                    Xong hết thẻ đến hạn hôm nay. Nghỉ ngơi thôi!
                  </Text>
                </View>
              )
            )}
            {decks.length > 0 && <StreakCard stats={stats} />}
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
            <DailyChallenge challenge={challenge} />
            <WeakWords words={weak} />
            <EnrichBackfillButton banner onDone={load} />
            {decks.length > 0 && (
              <>
                <Button
                  title="Xem tiến độ học"
                  icon={<TrendingUp size={18} color={colors.text} />}
                  variant="secondary"
                  onPress={() => router.push("/progress")}
                  style={styles.progressBtn}
                />
                <Button
                  title="Sao lưu tài khoản (JSON)"
                  icon={<Save size={18} color={colors.text} />}
                  variant="ghost"
                  onPress={handleBackup}
                  loading={backupBusy}
                  style={styles.backupBtn}
                />
              </>
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
    // Khối hành động chính của ngày, đặt trên cùng trang chủ.
    todayCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.brand,
      backgroundColor: colors.brandLight,
      marginBottom: spacing.md,
    },
    todayPressed: { opacity: 0.75 },
    todayIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
    },
    todayBody: { flex: 1, minWidth: 0 },
    todayTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    todaySub: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
    todayCta: { fontSize: 14, fontWeight: "700", color: colors.brandDark },
    doneCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.success,
      backgroundColor: colors.tints.green.bg,
      marginBottom: spacing.md,
    },
    doneText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.text },
    progressBtn: { marginTop: spacing.md },
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
