import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { QuickCreator } from "@/components/QuickCreator";
import { parseSharedText } from "@/lib/share-text";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles } from "@/contexts/ThemeContext";

/**
 * Đích đến của thao tác **Chia sẻ** từ app khác (Chrome, Kindle, YouTube...).
 *
 * Bản mobile của `src/components/ShareTarget.tsx` bên web: cùng cách phân loại
 * nội dung (`lib/share-text.ts`), khác ở chỗ dựng giao diện.
 */
export function ShareTarget({
  shared,
  onDone,
}: {
  shared: string;
  /** Gọi khi người dùng đóng ô tạo thẻ — màn hình cha đưa về trang chủ. */
  onDone?: () => void;
}) {
  const styles = useStyles(makeStyles);
  const { text, isSingleTerm, term, candidates } = useMemo(
    () => parseSharedText(shared),
    [shared]
  );
  const [picked, setPicked] = useState<string | null>(term);

  if (!text) {
    return (
      <View style={styles.wrap}>
        <Empty>
          Không nhận được nội dung nào. Hãy bôi đen một từ ở app khác rồi chọn
          Chia sẻ → LinguaCards.
        </Empty>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        {isSingleTerm
          ? "Đang tra từ bạn vừa chia sẻ."
          : "Chạm vào từ bạn muốn tạo thẻ."}
      </Text>

      <ScrollView style={styles.quoteBox} contentContainerStyle={styles.quotePad}>
        <Text style={styles.quote}>{text}</Text>
      </ScrollView>

      {!isSingleTerm &&
        (candidates.length > 0 ? (
          <View style={styles.chips}>
            {candidates.map((w) => {
              const active = picked?.toLowerCase() === w.toLowerCase();
              return (
                <Pressable
                  key={w.toLowerCase()}
                  onPress={() => setPicked(w)}
                  style={[styles.chip, active && styles.chipOn]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextOn]}>
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Empty>
            Không tìm thấy từ tiếng Anh nào trong nội dung này. Bấm nút ＋ ở
            trang bộ thẻ để tự gõ.
          </Empty>
        ))}

      {/* `key` đổi theo từ đã chọn → QuickCreator mount lại và tra từ mới. */}
      <QuickCreator
        key={picked ?? ""}
        initialWord={picked ?? undefined}
        autoOpen={!!picked}
        hideFab
        onClose={onDone}
      />
    </View>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: spacing.md, padding: spacing.lg },
    hint: { color: colors.textMuted, fontSize: 14 },
    quoteBox: {
      maxHeight: 160,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: radius.md,
    },
    quotePad: { padding: spacing.md },
    quote: { color: colors.text, fontSize: 14, fontStyle: "italic" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    chipOn: { borderColor: colors.brand, backgroundColor: colors.brandLight },
    chipText: { color: colors.textMuted, fontSize: 14 },
    chipTextOn: { color: colors.brandDark, fontWeight: "700" },
    empty: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  });
