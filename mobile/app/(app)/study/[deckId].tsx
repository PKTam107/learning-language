import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { CardStatus, CardWithProgress } from "@/types";
import { fetchCardsWithProgress, recordProgress } from "@/lib/cards";
import { STATUS_META, isDue } from "@/lib/status";
import { FlashcardFlip } from "@/components/flashcard/FlashcardFlip";
import { StatusDot } from "@/components/status/StatusDot";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing } from "@/lib/theme";
import { PartyPopper } from "lucide-react-native";

type Mode = "all" | "weak" | "due";
type Phase = "setup" | "studying" | "done";
type Assessed = "hard" | "good" | "easy";

const isWeak = (c: CardWithProgress) => {
  const s = c.progress?.status ?? "new";
  return s === "new" || s === "hard";
};

/** Ưu tiên thẻ "hard" rồi "new", sau đó "good", cuối cùng "easy". */
function orderCards(cards: CardWithProgress[]): CardWithProgress[] {
  const weight = (c: CardWithProgress) => {
    const s = c.progress?.status ?? "new";
    if (s === "hard") return 0;
    if (s === "new") return 1;
    if (s === "good") return 2;
    return 3;
  };
  return [...cards].sort((a, b) => weight(a) - weight(b));
}

function shuffleArr<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const LIMIT_OPTIONS = [0, 10, 20, 30, 50];

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();

  const [all, setAll] = useState<CardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("setup");
  const [inited, setInited] = useState(false);

  const [mode, setMode] = useState<Mode>("all");
  const [limit, setLimit] = useState(0);
  const [shuffle, setShuffle] = useState(false);

  const [queue, setQueue] = useState<CardWithProgress[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<Record<Assessed, number>>({
    hard: 0,
    good: 0,
    easy: 0,
  });

  const load = useCallback(() => {
    if (!deckId) return Promise.resolve();
    return fetchCardsWithProgress(deckId).then(setAll);
  }, [deckId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const weakCount = useMemo(() => all.filter(isWeak).length, [all]);
  const dueCount = useMemo(
    () => all.filter((c) => isDue(c.progress?.next_due_at)).length,
    [all]
  );

  useEffect(() => {
    if (inited || all.length === 0) return;
    setInited(true);
    if (all.some((c) => isDue(c.progress?.next_due_at))) setMode("due");
  }, [all, inited]);

  function start() {
    const pool =
      mode === "weak"
        ? all.filter(isWeak)
        : mode === "due"
          ? all.filter((c) => isDue(c.progress?.next_due_at))
          : all;
    let list = shuffle ? shuffleArr(pool) : orderCards(pool);
    if (limit > 0) list = list.slice(0, limit);
    setQueue(list);
    setIndex(0);
    setFlipped(false);
    setCounts({ hard: 0, good: 0, easy: 0 });
    setPhase("studying");
  }

  function backToSetup() {
    setPhase("setup");
    setLoading(true);
    load().finally(() => setLoading(false));
  }

  const current = queue[index];

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => {
      if (i + 1 >= queue.length) {
        setPhase("done");
        return i;
      }
      return i + 1;
    });
  }, [queue.length]);

  const assess = useCallback(
    (status: Assessed) => {
      if (!current) return;
      void recordProgress(current.id, status).catch(() => {});
      setCounts((c) => ({ ...c, [status]: c[status] + 1 }));
      next();
    },
    [current, next]
  );

  if (loading) {
    return (
      <Screen title="Học">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (all.length === 0) {
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

  // ---------- Pha 1: Chọn chế độ ----------
  if (phase === "setup") {
    const canStart =
      !(mode === "weak" && weakCount === 0) && !(mode === "due" && dueCount === 0);
    return (
      <Screen title="Bắt đầu học">
        <ScrollView contentContainerStyle={styles.setup}>
          <Text style={styles.setupHint}>Chọn cách ôn tập.</Text>

          <ModeOption
            label="Ôn hôm nay"
            desc="Thẻ đến hạn ôn (spaced repetition)"
            count={dueCount}
            active={mode === "due"}
            disabled={dueCount === 0}
            onPress={() => setMode("due")}
          />
          <ModeOption
            label="Ôn tất cả"
            desc="Toàn bộ từ trong bộ thẻ"
            count={all.length}
            active={mode === "all"}
            onPress={() => setMode("all")}
          />
          <ModeOption
            label="Chỉ từ chưa thuộc"
            desc="Từ chưa học hoặc đánh giá khó"
            count={weakCount}
            active={mode === "weak"}
            disabled={weakCount === 0}
            onPress={() => setMode("weak")}
          />

          <Text style={styles.optLabel}>Số thẻ/phiên</Text>
          <View style={styles.chipRow}>
            {LIMIT_OPTIONS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setLimit(n)}
                style={[styles.chip, limit === n && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, limit === n && styles.chipTextActive]}
                >
                  {n === 0 ? "Tất cả" : n}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.shuffleRow}>
            <Text style={styles.optLabel}>Xáo trộn</Text>
            <Switch value={shuffle} onValueChange={setShuffle} />
          </View>

          <View style={styles.setupActions}>
            <Button
              title="Bắt đầu"
              onPress={start}
              disabled={!canStart}
              style={styles.grow}
            />
            <Button
              title="Thoát"
              variant="secondary"
              onPress={() => router.back()}
              style={styles.grow}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ---------- Pha 3: Tóm tắt ----------
  if (phase === "done") {
    const reviewed = counts.hard + counts.good + counts.easy;
    return (
      <Screen title="Hoàn thành">
        <View style={styles.center}>
          <PartyPopper size={48} color={colors.brand} />
          <Text style={styles.doneTitle}>Hoàn thành phiên học!</Text>
          <Text style={styles.doneSub}>Bạn đã ôn {reviewed} từ.</Text>

          <View style={styles.summary}>
            <SummaryRow status="hard" value={counts.hard} />
            <SummaryRow status="good" value={counts.good} />
            <SummaryRow status="easy" value={counts.easy} />
          </View>

          <View style={styles.doneActions}>
            <Button title="Học tiếp" onPress={backToSetup} style={styles.grow} />
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

  // ---------- Pha 2: Đang học ----------
  const progressPct = queue.length
    ? Math.round((index / queue.length) * 100)
    : 0;

  return (
    <Screen title="Học">
      <View style={styles.body}>
        <Text style={styles.progressLabel}>
          Đang học: {index + 1}/{queue.length} từ
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.cardWrap}>
          {current && (
            <FlashcardFlip
              card={current}
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
            />
          )}
        </View>

        {flipped ? (
          <View style={styles.assessRow}>
            <Button
              title="Chưa thuộc"
              onPress={() => assess("hard")}
              style={[styles.grow, { backgroundColor: STATUS_META.hard.color }]}
            />
            <Button
              title="Tạm nhớ"
              onPress={() => assess("good")}
              style={[styles.grow, { backgroundColor: STATUS_META.good.color }]}
            />
            <Button
              title="Đã thuộc"
              onPress={() => assess("easy")}
              style={[styles.grow, { backgroundColor: STATUS_META.easy.color }]}
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

function Screen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title }} />
      {children}
    </View>
  );
}

function ModeOption({
  label,
  desc,
  count,
  active,
  disabled,
  onPress,
}: {
  label: string;
  desc: string;
  count: number;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.mode,
        active && styles.modeActive,
        disabled && styles.modeDisabled,
      ]}
    >
      <View style={styles.grow}>
        <Text style={styles.modeLabel}>{label}</Text>
        <Text style={styles.modeDesc}>{desc}</Text>
      </View>
      <View style={[styles.badge, active && styles.badgeActive]}>
        <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function SummaryRow({ status, value }: { status: Assessed; value: number }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLeft}>
        <StatusDot status={status} />
        <Text style={styles.summaryLabel}>{STATUS_META[status].label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
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

  // setup
  setup: { padding: spacing.lg, gap: spacing.sm },
  setupHint: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  mode: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modeActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  modeDisabled: { opacity: 0.4 },
  modeLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  modeDesc: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  badge: {
    minWidth: 32,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  badgeActive: { backgroundColor: colors.brand },
  badgeText: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  badgeTextActive: { color: "#fff" },
  optLabel: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  chipText: { fontSize: 14, color: colors.textMuted },
  chipTextActive: { color: colors.brandDark, fontWeight: "600" },
  shuffleRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  setupActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },

  // done
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  doneSub: { fontSize: 15, color: colors.textMuted },
  summary: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.md },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  summaryLabel: { fontSize: 14, color: colors.text },
  summaryValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  doneActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
});
