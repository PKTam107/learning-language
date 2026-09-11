import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { CardStatus, CardWithProgress } from "@/types";
import {
  fetchCardsByIds,
  fetchCardsWithProgress,
  fetchDueQueueAllDecks,
  recordProgress,
  undoReview,
  type ReviewReceipt,
} from "@/lib/cards";
import { fetchWeakWords, WEAK_SESSION_SIZE } from "@/lib/weak";
import { STATUS_META } from "@/lib/status";
import { resolvePolicy } from "@/lib/policy";
import { buildDueQueue, isSuspended, UNLIMITED, type QueuePolicy } from "@/lib/queue";
import { useSettings } from "@/lib/settings";
import { playPronunciation } from "@/lib/audio";
import {
  hasCloze,
  MCQ_TYPES,
  pickReviewType,
  REVIEW_TYPES,
  SESSION_TYPES,
  type ReviewType,
  type SessionReviewType,
} from "@/lib/quiz";
import { FlashcardFlip } from "@/components/flashcard/FlashcardFlip";
import { QuizCard } from "@/components/flashcard/QuizCard";
import { StatusDot } from "@/components/status/StatusDot";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import { PartyPopper } from "lucide-react-native";

type Mode = "all" | "weak" | "due";
type Phase = "setup" | "studying" | "done";
type Assessed = "hard" | "good" | "easy";

const isWeak = (c: CardWithProgress) => {
  const s = c.progress?.status ?? "new";
  return s === "new" || s === "hard";
};

/**
 * Ưu tiên thẻ "hard" rồi "new", sau đó "good", cuối cùng "easy"; trong cùng
 * một hạng thì theo thứ tự đã thêm (cũ trước).
 *
 * Phần so sánh phải là **thứ tự toàn phần** — chỉ so `weight` thì mọi thẻ cùng
 * hạng đều "bằng nhau", và thứ tự cuối cùng rơi về thứ tự đầu vào. Bộ thẻ mới
 * toàn từ "Chưa học" thì cả hàm thành vô nghĩa, nên phiên "không xáo trộn"
 * trông y như đã xáo. Chốt thêm `id` vì thẻ nhập từ Excel dùng chung một
 * created_at (insert cả lô trong một câu lệnh).
 */
function orderCards(cards: CardWithProgress[]): CardWithProgress[] {
  const weight = (c: CardWithProgress) => {
    const s = c.progress?.status ?? "new";
    if (s === "hard") return 0;
    if (s === "new") return 1;
    if (s === "good") return 2;
    return 3;
  };
  return [...cards].sort(
    (a, b) =>
      weight(a) - weight(b) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id)
  );
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

/** Một lượt đánh giá đã ghi, giữ lại để hoàn tác được. */
interface HistoryEntry {
  /** Vị trí thẻ trong hàng đợi — để quay lại đúng thẻ đó. */
  index: number;
  status: Assessed;
  /**
   * Lời hứa ghi tiến độ. Không await lúc đánh giá để phiên học không phải chờ
   * mạng, nhưng hoàn tác vẫn có đủ ảnh chụp trạng thái cũ.
   */
  receipt: Promise<ReviewReceipt | null>;
}

/**
 * Nguồn thẻ của phiên học, suy ra từ tham số route.
 *
 * Route vẫn là `/study/[deckId]`, nhưng hai giá trị đặc biệt `today` và `weak`
 * mở phiên gộp nhiều bộ thẻ. Không đụng deckId thật vì id luôn là UUID.
 */
type SourceKind = "deck" | "due" | "weak";

const SOURCE_META: Record<
  SourceKind,
  { title: string; hint: string; empty: string }
> = {
  deck: {
    title: "Bắt đầu học",
    hint: "Chọn cách ôn tập.",
    empty: "Bộ thẻ này chưa có từ nào.",
  },
  due: {
    title: "Ôn hôm nay",
    hint: "Thẻ đến hạn ôn từ mọi bộ thẻ, gộp vào một phiên.",
    empty: "Hôm nay không còn thẻ nào đến hạn. Quay lại mai nhé!",
  },
  weak: {
    title: "Ôn từ hay quên",
    hint: "Những từ bạn đánh giá “Chưa thuộc” nhiều nhất.",
    empty: "Chưa có từ nào bị đánh giá “Chưa thuộc”. Học vài phiên rồi quay lại.",
  },
};

export default function StudyScreen() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();

  const [all, setAll] = useState<CardWithProgress[]>([]);
  const [policy, setPolicy] = useState<QueuePolicy>(UNLIMITED);
  /** Từ mới bị giữ lại vì hết hạn mức hôm nay (chỉ để thông báo). */
  const [heldBack, setHeldBack] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("setup");
  const [inited, setInited] = useState(false);

  const [mode, setMode] = useState<Mode>("all");
  /**
   * Kiểu ôn của phiên. "auto" không phải một dạng câu hỏi mà là chính sách chọn
   * kiểu cho từng thẻ (xem `pickReviewType`) — kiểu THẬT của thẻ đang học tính
   * riêng ở `currentType`.
   */
  const [sessionType, setSessionType] = useState<SessionReviewType>("flashcard");
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [undoing, setUndoing] = useState(false);
  /** Tăng sau mỗi lần hoàn tác để QuizCard mount lại → trả lời lại được. */
  const [attempt, setAttempt] = useState(0);

  const { settings, ready } = useSettings();

  const kind: SourceKind =
    deckId === "today" ? "due" : deckId === "weak" ? "weak" : "deck";
  const meta = SOURCE_META[kind];

  /**
   * Thẻ tạm treo (leech) bị loại khỏi MỌI nguồn học, kể cả "Ôn tất cả" và "Bạn
   * hay quên" — treo mà vẫn hiện trong phiên thì thao tác treo vô nghĩa.
   * `buildDueQueue` cũng tự lọc; đây là chốt cho các chế độ không qua hàng đợi.
   */
  const load = useCallback(async () => {
    const usable = (list: CardWithProgress[]) => list.filter((c) => !isSuspended(c));

    if (kind === "due") {
      const queue = await fetchDueQueueAllDecks(settings.newPerDay);
      setAll(usable(queue.cards));
      setHeldBack(queue.newHeldBack);
      return;
    }
    if (kind === "weak") {
      // Xếp hạng theo số lần quên rồi lấy thẻ đầy đủ theo đúng thứ tự đó.
      const ranked = await fetchWeakWords(WEAK_SESSION_SIZE);
      setAll(usable(await fetchCardsByIds(ranked.map((w) => w.cardId))));
      return;
    }
    if (!deckId) return;
    // Chế độ "Ôn hôm nay" của một bộ thẻ cũng phải tôn trọng hạn mức từ mới
    // chung của tài khoản.
    const [cards, queuePolicy] = await Promise.all([
      fetchCardsWithProgress(deckId),
      resolvePolicy(settings.newPerDay),
    ]);
    setAll(usable(cards));
    setPolicy(queuePolicy);
  }, [kind, deckId, settings.newPerDay]);

  // Chờ cài đặt (hạn mức từ mới) nạp xong mới nạp thẻ, để không nạp hai lần.
  useEffect(() => {
    if (!ready) return;
    load().finally(() => setLoading(false));
  }, [load, ready]);

  const weakCount = useMemo(() => all.filter(isWeak).length, [all]);
  /** Hàng đợi hôm nay của bộ thẻ này (đã trừ hạn mức từ mới). */
  const dueQueue = useMemo(() => buildDueQueue(all, policy), [all, policy]);
  const dueCount = dueQueue.cards.length;

  /**
   * Tập thẻ của phiên theo Mode đang chọn — chỉ nguồn "deck" mới lọc theo Mode,
   * due/weak đã được lọc từ lúc nạp. Tính ở đây (không phải trong `start`) để
   * các con số ở màn chuẩn bị nói về **đúng tập thẻ sắp học**.
   */
  const pool = useMemo(
    () =>
      kind !== "deck"
        ? all
        : mode === "weak"
          ? all.filter(isWeak)
          : mode === "due"
            ? dueQueue.cards
            : all,
    [kind, all, mode, dueQueue]
  );
  /** Số thẻ có ví dụ khoét được chỗ trống — phiên cloze chỉ lấy được các thẻ này. */
  const clozeCount = useMemo(() => pool.filter(hasCloze).length, [pool]);

  useEffect(() => {
    if (kind !== "deck" || inited || all.length === 0) return;
    setInited(true);
    if (dueCount > 0) setMode("due");
  }, [all, dueCount, inited, kind]);

  function start() {
    // Phiên cloze chỉ gồm thẻ khoét được chỗ trống (khác chế độ "Tự động", ở đó
    // thẻ thiếu dữ liệu được hạ xuống kiểu khác chứ không bị bỏ).
    const eligible = sessionType === "cloze" ? pool.filter(hasCloze) : pool;
    let list = shuffle ? shuffleArr(eligible) : orderCards(eligible);
    if (limit > 0) list = list.slice(0, limit);
    setQueue(list);
    setIndex(0);
    setFlipped(false);
    setCounts({ hard: 0, good: 0, easy: 0 });
    setHistory([]);
    setPhase("studying");
  }

  function backToSetup() {
    setPhase("setup");
    setHistory([]);
    setLoading(true);
    load().finally(() => setLoading(false));
  }

  const current = queue[index];

  /**
   * Kiểu ôn THẬT của thẻ đang học. Tất định theo dữ liệu thẻ nên không đổi giữa
   * hai lần render (đổi giữa phiên là câu hỏi tự biến dạng dưới tay người học).
   */
  const currentType: ReviewType = useMemo(() => {
    if (sessionType !== "auto") return sessionType;
    return current ? pickReviewType(current, all) : "flashcard";
  }, [sessionType, current, all]);

  // Tự phát âm khi lật thẻ (nếu bật trong Cài đặt).
  useEffect(() => {
    if (phase !== "studying" || !flipped || !settings.autoSpeak || !current) return;
    void playPronunciation({
      url: current.audio_us,
      text: current.term,
      label: "US",
    });
    // Chỉ chạy khi trạng thái lật đổi (cùng thẻ) — không thêm `current` để
    // tránh phát lại khi state khác đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, phase, settings.autoSpeak]);

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
      // Không await: lượt học không nên chờ mạng. Promise được giữ trong
      // history để hoàn tác có đủ ảnh chụp trạng thái cũ.
      const receipt = recordProgress(current.id, status).catch((e: unknown) => {
        console.warn("recordProgress:", (e as Error).message);
        return null;
      });
      setHistory((h) => [...h, { index, status, receipt }]);
      setCounts((c) => ({ ...c, [status]: c[status] + 1 }));
      next();
    },
    [current, index, next]
  );

  /**
   * Hoàn tác lượt đánh giá gần nhất: trả tiến độ + nhật ký ôn về trạng thái
   * trước đó rồi quay lại đúng thẻ đó.
   */
  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || undoing) return;
    setUndoing(true);
    try {
      const receipt = await last.receipt;
      if (receipt) await undoReview(receipt);
      setHistory((h) => h.slice(0, -1));
      setCounts((c) => ({
        ...c,
        [last.status]: Math.max(0, c[last.status] - 1),
      }));
      setIndex(last.index);
      setFlipped(false);
      setAttempt((a) => a + 1);
      setPhase("studying");
    } catch (e) {
      Alert.alert("Không hoàn tác được", (e as Error).message);
    } finally {
      setUndoing(false);
    }
  }, [history, undoing]);

  // Kết quả câu ôn (trắc nghiệm/gõ/nghe): đúng → "good", sai → "hard".
  const handleQuizAnswer = useCallback(
    (correct: boolean) => assess(correct ? "good" : "hard"),
    [assess]
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
          <Text style={styles.emptyTitle}>{meta.empty}</Text>
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
      kind !== "deck" ||
      (!(mode === "weak" && weakCount === 0) &&
        !(mode === "due" && dueCount === 0));
    return (
      <Screen title={meta.title}>
        <ScrollView contentContainerStyle={styles.setup}>
          <Text style={styles.setupHint}>{meta.hint}</Text>

          {kind === "deck" ? (
            <>
              <ModeOption
                label="Ôn hôm nay"
                desc={
                  dueQueue.newCount > 0
                    ? `${dueQueue.reviewCount} thẻ tới hạn + ${dueQueue.newCount} từ mới`
                    : "Thẻ đến hạn ôn (spaced repetition)"
                }
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
            </>
          ) : (
            /* due/weak: tập thẻ đã cố định, chỉ cho biết có bao nhiêu từ. */
            <View style={styles.poolCard}>
              <Text style={styles.poolText}>
                <Text style={styles.poolCount}>{all.length}</Text> từ trong phiên
                này.
              </Text>
            </View>
          )}

          {(kind === "deck" ? dueQueue.newHeldBack : heldBack) > 0 && (
            <Text style={styles.quotaNote}>
              Còn {kind === "deck" ? dueQueue.newHeldBack : heldBack} từ mới đang
              chờ tới lượt — hôm nay đã dùng hết hạn mức {settings.newPerDay} từ
              mới/ngày (đổi được trong Cài đặt).
            </Text>
          )}

          <Text style={styles.optLabel}>Kiểu ôn</Text>
          <View style={styles.chipRow}>
            {SESSION_TYPES.map((rt) => {
              // "Tự động" không bao giờ bị khóa: nó tự hạ xuống kiểu khả thi cho
              // từng thẻ, nên bộ thẻ nhỏ / không có ví dụ vẫn học được.
              const disabled =
                rt.value === "auto"
                  ? false
                  : // Cả hai chiều trắc nghiệm đều cần đủ thẻ để dựng đáp án nhiễu.
                    (MCQ_TYPES.includes(rt.value as ReviewType) && all.length < 4) ||
                    (rt.value === "cloze" && clozeCount === 0);
              return (
                <Pressable
                  key={rt.value}
                  onPress={() => setSessionType(rt.value)}
                  disabled={disabled}
                  style={[
                    styles.chip,
                    sessionType === rt.value && styles.chipActive,
                    disabled && styles.modeDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sessionType === rt.value && styles.chipTextActive,
                    ]}
                  >
                    {rt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {sessionType === "auto" && (
            <Text style={styles.quotaNote}>
              Mỗi thẻ một kiểu, khó dần theo mức thuộc: từ mới thì lật thẻ, chưa
              thuộc thì trắc nghiệm, đang thuộc thì điền chỗ trống / Việt → Anh,
              đã thuộc thì gõ lại và nghe.
            </Text>
          )}
          {sessionType === "cloze" && clozeCount < pool.length && (
            <Text style={styles.quotaNote}>
              Chỉ {clozeCount}/{pool.length} thẻ có ví dụ chứa từ để khoét chỗ
              trống — phiên này sẽ chỉ gồm những thẻ đó.
            </Text>
          )}

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
        {/* Chỉ ăn mừng khi thật sự có ôn — thoát ngay thì không bắn pháo. */}
        {reviewed > 0 && <Confetti />}
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

          {/* Bấm nhầm ở thẻ cuối thì vẫn sửa được sau khi phiên đã kết thúc. */}
          {history.length > 0 && (
            <Pressable onPress={() => void undo()} disabled={undoing}>
              <Text style={[styles.undoText, undoing && styles.undoDisabled]}>
                ↩ Hoàn tác thẻ cuối
              </Text>
            </Pressable>
          )}
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
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            Đang học: {index + 1}/{queue.length} từ
            {/* Chế độ Tự động đổi kiểu theo từng thẻ — không nói ra thì người
                học tưởng app đang lỗi khi câu hỏi đột nhiên khác dạng. */}
            {sessionType === "auto" &&
              ` · ${REVIEW_TYPES.find((r) => r.value === currentType)?.label}`}
          </Text>
          {history.length > 0 && (
            <Pressable onPress={() => void undo()} disabled={undoing}>
              <Text style={[styles.undoText, undoing && styles.undoDisabled]}>
                ↩ Hoàn tác
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.cardWrap}>
          {current && currentType === "flashcard" && (
            <FlashcardFlip
              card={current}
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
            />
          )}
          {current && currentType !== "flashcard" && (
            <QuizCard
              key={`${current.id}:${attempt}`}
              card={current}
              pool={all}
              type={currentType}
              autoSpeak={settings.autoSpeak}
              onAnswered={handleQuizAnswer}
            />
          )}
        </View>

        {currentType === "flashcard" &&
          (flipped ? (
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
          ))}
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
  const styles = useStyles(makeStyles);
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
  const styles = useStyles(makeStyles);
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
  const styles = useStyles(makeStyles);
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1, padding: spacing.lg, gap: spacing.md },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.xl,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    progressLabel: { fontSize: 14, color: colors.textMuted },
    undoText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.brand,
      paddingVertical: spacing.xs,
      marginTop: spacing.sm,
    },
    undoDisabled: { opacity: 0.4 },
    quotaNote: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
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
    // Khối tóm tắt tập thẻ cho phiên due/weak (thay chỗ 3 ô chọn Mode).
    poolCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.brand,
      backgroundColor: colors.brandLight,
      padding: spacing.lg,
    },
    poolText: { fontSize: 14, color: colors.text },
    poolCount: { fontWeight: "800", color: colors.brandDark },
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
