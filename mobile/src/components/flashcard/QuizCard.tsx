import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CardWithProgress } from "@/types";
import { buildMcq, checkTyped, type ReviewType } from "@/lib/quiz";
import { playPronunciation } from "@/lib/audio";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { Button } from "@/components/ui/Button";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";
import { Check, Volume2, X } from "lucide-react-native";

interface Props {
  card: CardWithProgress;
  /** Nguồn lấy đáp án nhiễu cho trắc nghiệm (toàn bộ thẻ trong deck). */
  pool: CardWithProgress[];
  type: Exclude<ReviewType, "flashcard">;
  autoSpeak: boolean;
  /** Gọi khi người dùng bấm "Câu tiếp" sau khi đã trả lời. */
  onAnswered: (correct: boolean) => void;
}

/** Một câu ôn dạng trắc nghiệm / gõ từ / nghe. Tự chấm rồi báo kết quả về cha. */
export function QuizCard({ card, pool, type, autoSpeak, onAnswered }: Props) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const mcq = useMemo(
    () => (type === "mcq" ? buildMcq(card, pool) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, type]
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const spokeRef = useRef(false);

  const speak = () =>
    playPronunciation({ url: card.audio_us, text: card.term, label: "US" });

  // Nghe: tự phát âm khi vào câu. MCQ/gõ: phát khi lộ đáp án (nếu bật autoSpeak).
  useEffect(() => {
    if (type === "listening" && !spokeRef.current) {
      spokeRef.current = true;
      void speak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  function reveal(correct: boolean) {
    setResult(correct);
    if (autoSpeak) void speak();
  }

  function chooseMcq(i: number) {
    if (result !== null || !mcq) return;
    setSelected(i);
    reveal(i === mcq.answerIndex);
  }

  function submitText() {
    if (result !== null) return;
    reveal(checkTyped(text, card.term));
  }

  const answered = result !== null;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ----- Đề bài ----- */}
      {type === "mcq" ? (
        <View style={styles.prompt}>
          <Text style={styles.term}>{card.term}</Text>
          {!!card.phonetic && <Text style={styles.phonetic}>{card.phonetic}</Text>}
          <AudioButton url={card.audio_us} text={card.term} label="US" />
          <Text style={styles.ask}>Chọn nghĩa đúng:</Text>
        </View>
      ) : type === "typing" ? (
        <View style={styles.prompt}>
          <Text style={styles.qLabel}>Nghĩa</Text>
          <Text style={styles.meaning}>{card.meaning_vi || "(không có nghĩa)"}</Text>
          {!!card.part_of_speech && (
            <Text style={styles.pos}>({card.part_of_speech})</Text>
          )}
          <Text style={styles.ask}>Gõ lại từ tiếng Anh:</Text>
        </View>
      ) : (
        <View style={styles.prompt}>
          <Pressable style={styles.listenBtn} onPress={() => void speak()}>
            <Volume2 size={30} color={colors.brandDark} />
          </Pressable>
          <Text style={styles.qLabel}>Nghe rồi gõ lại từ</Text>
        </View>
      )}

      {/* ----- Ô trả lời ----- */}
      {type === "mcq" && mcq ? (
        <View style={styles.options}>
          {mcq.options.map((opt, i) => {
            const isAnswer = i === mcq.answerIndex;
            const isPicked = i === selected;
            return (
              <Pressable
                key={i}
                onPress={() => chooseMcq(i)}
                disabled={answered}
                style={[
                  styles.option,
                  answered && isAnswer && styles.optionCorrect,
                  answered && isPicked && !isAnswer && styles.optionWrong,
                ]}
              >
                <Text style={styles.optionText}>{opt}</Text>
                {answered && isAnswer && <Check size={18} color={colors.success} />}
                {answered && isPicked && !isAnswer && (
                  <X size={18} color={colors.danger} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : type === "mcq" ? (
        // Không dựng được trắc nghiệm cho thẻ này → hiện đáp án để tự đánh giá.
        <Text style={styles.fallback}>
          Không đủ dữ liệu để tạo trắc nghiệm. Đáp án: {card.meaning_vi}
        </Text>
      ) : (
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!answered}
          placeholder="Nhập từ..."
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submitText}
          style={[
            styles.input,
            answered && (result ? styles.inputCorrect : styles.inputWrong),
          ]}
        />
      )}

      {/* ----- Phản hồi ----- */}
      {answered && (
        <View style={[styles.feedback, result ? styles.fbOk : styles.fbBad]}>
          <Text style={[styles.fbText, result ? styles.fbTextOk : styles.fbTextBad]}>
            {result ? "✓ Chính xác!" : `✗ Đáp án: ${card.term}`}
          </Text>
          {type !== "mcq" && (
            <Text style={styles.fbMeaning}>{card.meaning_vi}</Text>
          )}
        </View>
      )}

      {/* ----- Hành động ----- */}
      <View style={styles.actions}>
        {!answered && type !== "mcq" && (
          <Button
            title="Kiểm tra"
            onPress={submitText}
            disabled={text.trim().length === 0}
          />
        )}
        {answered && (
          <Button title="Câu tiếp →" onPress={() => onAnswered(!!result)} />
        )}
        {!answered && type === "mcq" && !mcq && (
          <Button title="Câu tiếp →" onPress={() => onAnswered(false)} />
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, width: "100%" },
    content: { gap: spacing.lg, paddingVertical: spacing.md },
    prompt: { alignItems: "center", gap: spacing.sm },
    term: { fontSize: 34, fontWeight: "800", color: colors.text, textAlign: "center" },
    phonetic: { fontSize: 16, color: colors.textMuted },
    qLabel: {
      fontSize: 12,
      color: colors.textSubtle,
      textTransform: "uppercase",
      fontWeight: "600",
    },
    meaning: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.brandDark,
      textAlign: "center",
    },
    pos: { fontSize: 14, color: colors.textSubtle },
    ask: { marginTop: spacing.sm, fontSize: 14, color: colors.textMuted },
    listenBtn: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      backgroundColor: colors.brandLight,
      alignItems: "center",
      justifyContent: "center",
    },
    options: { gap: spacing.sm },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    optionCorrect: {
      borderColor: colors.success,
      backgroundColor: colors.tints.green.bg,
    },
    optionWrong: {
      borderColor: colors.danger,
      backgroundColor: colors.tints.red.bg,
    },
    optionText: { flex: 1, fontSize: 16, color: colors.text },
    fallback: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 18,
      color: colors.text,
      backgroundColor: colors.card,
      textAlign: "center",
    },
    inputCorrect: {
      borderColor: colors.success,
      backgroundColor: colors.tints.green.bg,
    },
    inputWrong: {
      borderColor: colors.danger,
      backgroundColor: colors.tints.red.bg,
    },
    feedback: { padding: spacing.md, borderRadius: radius.md, alignItems: "center", gap: 4 },
    fbOk: { backgroundColor: colors.tints.green.bg },
    fbBad: { backgroundColor: colors.tints.red.bg },
    fbText: { fontSize: 16, fontWeight: "700" },
    fbTextOk: { color: colors.success },
    fbTextBad: { color: colors.danger },
    fbMeaning: { fontSize: 14, color: colors.textMuted },
    actions: { marginTop: spacing.sm },
  });
