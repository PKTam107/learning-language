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
import {
  buildCloze,
  buildMcq,
  checkCloze,
  checkTyped,
  type ReviewType,
} from "@/lib/quiz";
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
  // "Việt → Anh" dùng chung cơ chế trắc nghiệm, chỉ đảo chiều đề/đáp án.
  const isMcq = type === "mcq" || type === "mcq_reverse";
  const reverse = type === "mcq_reverse";
  const mcq = useMemo(
    () =>
      isMcq
        ? buildMcq(card, pool, reverse ? "meaningToTerm" : "termToMeaning")
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, type]
  );

  // Câu khoét chỗ trống dựng từ chính ví dụ của thẻ (không cần pool).
  const cloze = useMemo(
    () => (type === "cloze" ? buildCloze(card) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, type]
  );
  /** Ba kiểu gõ tay: gõ từ, nghe, điền chỗ trống. */
  const isTyped = !isMcq;

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
    reveal(
      cloze ? checkCloze(text, cloze, card.term) : checkTyped(text, card.term)
    );
  }

  const answered = result !== null;
  // Đáp án đúng để hiện lúc phản hồi: chỉ chiều nhận diện (mcq) mới là nghĩa
  // tiếng Việt; các kiểu còn lại đáp án đều là từ tiếng Anh (cloze thì đúng
  // dạng chia có trong câu).
  const correctAnswer =
    type === "mcq" ? card.meaning_vi : (cloze?.answer ?? card.term);
  /**
   * Không dựng được câu hỏi cho thẻ này (thiếu thẻ làm nhiễu, hoặc không có ví
   * dụ chứa từ). Hiện thẳng đáp án để tự đánh giá — dựng câu hỏng còn tệ hơn.
   */
  const unbuildable = (isMcq && !mcq) || (type === "cloze" && !cloze);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ----- Đề bài ----- */}
      {type === "mcq_reverse" ? (
        <View style={styles.prompt}>
          <Text style={styles.qLabel}>Nghĩa</Text>
          <Text style={styles.meaning}>
            {card.meaning_vi || "(không có nghĩa)"}
          </Text>
          {!!card.part_of_speech && (
            <Text style={styles.pos}>({card.part_of_speech})</Text>
          )}
          <Text style={styles.ask}>Chọn từ tiếng Anh đúng:</Text>
        </View>
      ) : type === "mcq" ? (
        <View style={styles.prompt}>
          <Text style={styles.term}>{card.term}</Text>
          {!!card.phonetic && <Text style={styles.phonetic}>{card.phonetic}</Text>}
          <AudioButton url={card.audio_us} text={card.term} label="US" />
          <Text style={styles.ask}>Chọn nghĩa đúng:</Text>
        </View>
      ) : type === "cloze" ? (
        <View style={styles.prompt}>
          <Text style={styles.qLabel}>Điền vào chỗ trống</Text>
          {cloze ? (
            <Text style={styles.sentence}>
              {cloze.before}
              <Text
                style={[
                  styles.blank,
                  answered && (result ? styles.blankOk : styles.blankBad),
                ]}
              >
                {answered ? cloze.answer : "______"}
              </Text>
              {cloze.after}
            </Text>
          ) : (
            <Text style={styles.fallback}>
              Thẻ này chưa có ví dụ chứa từ để khoét chỗ trống.
            </Text>
          )}
          {/* Chỗ trống trong câu có thể điền được nhiều từ — nghĩa tiếng Việt
              chốt lại là đang hỏi từ nào. Đây là bài "dùng đúng từ trong ngữ
              cảnh", không phải bài đoán chữ. */}
          {!!card.meaning_vi && (
            <Text style={styles.ask}>Gợi ý: {card.meaning_vi}</Text>
          )}
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
      {isMcq && mcq ? (
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
      ) : unbuildable ? (
        <Text style={styles.fallback}>
          Không đủ dữ liệu để tạo câu hỏi. Đáp án:{" "}
          {type === "mcq" ? card.meaning_vi : card.term}
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
            {result ? "✓ Chính xác!" : `✗ Đáp án: ${correctAnswer}`}
          </Text>
          {/* Chiều nhận diện đã hiện nghĩa ngay trong đáp án → không nhắc lại.
              Cloze thì nghĩa đã nằm ở phần gợi ý của đề. */}
          {type !== "mcq" && type !== "cloze" && (
            <Text style={styles.fbMeaning}>{card.meaning_vi}</Text>
          )}
          {!!cloze?.translation && (
            <Text style={styles.fbMeaning}>{cloze.translation}</Text>
          )}
        </View>
      )}

      {/* ----- Hành động ----- */}
      <View style={styles.actions}>
        {!answered && isTyped && !unbuildable && (
          <Button
            title="Kiểm tra"
            onPress={submitText}
            disabled={text.trim().length === 0}
          />
        )}
        {answered && (
          <Button title="Câu tiếp →" onPress={() => onAnswered(!!result)} />
        )}
        {!answered && unbuildable && (
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
    sentence: {
      fontSize: 18,
      lineHeight: 30,
      color: colors.text,
      textAlign: "center",
    },
    blank: { fontWeight: "700", color: colors.brandDark },
    blankOk: { color: colors.success },
    blankBad: { color: colors.danger },
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
