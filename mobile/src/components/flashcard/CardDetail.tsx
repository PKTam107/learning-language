import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Card } from "@/types";
import { AudioButton } from "./AudioButton";
import { colors, radius, spacing } from "@/lib/theme";

/** Xem chi tiết 1 card đã lưu (read-only): phiên âm, audio US/UK, mọi nghĩa & ví dụ. */
export function CardDetail({ card }: { card: Card }) {
  const noContent =
    !card.meaning_vi && !card.definitions?.length && !card.examples?.length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.term}>{card.term}</Text>
        {!!card.part_of_speech && (
          <Text style={styles.pos}>{card.part_of_speech}</Text>
        )}
      </View>

      <View style={styles.audioRow}>
        <AudioButton url={card.audio_us} text={card.term} label="US" />
        <AudioButton url={card.audio_uk} text={card.term} label="UK" />
      </View>

      {(!!card.phonetic_uk || !!card.phonetic_us || !!card.phonetic) && (
        <View style={styles.ipaRow}>
          {!!card.phonetic_uk && (
            <Text style={styles.ipa}>
              <Text style={styles.ipaLabel}>UK</Text> {card.phonetic_uk}
            </Text>
          )}
          {!!card.phonetic_us && (
            <Text style={styles.ipa}>
              <Text style={styles.ipaLabel}>US</Text> {card.phonetic_us}
            </Text>
          )}
          {!card.phonetic_uk && !card.phonetic_us && !!card.phonetic && (
            <Text style={styles.ipa}>{card.phonetic}</Text>
          )}
        </View>
      )}

      {!!card.meaning_vi && <Text style={styles.meaning}>{card.meaning_vi}</Text>}

      {!!card.note && (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>GHI CHÚ</Text>
          <Text style={styles.noteText}>{card.note}</Text>
        </View>
      )}

      {card.definitions?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CÁC NGHĨA</Text>
          {card.definitions.map((d, i) => (
            <View key={i} style={styles.defItem}>
              {!!d.partOfSpeech && (
                <Text style={styles.defPos}>{d.partOfSpeech}</Text>
              )}
              <Text style={styles.defText}>{d.definitionVi || d.definition}</Text>
              {!!d.definitionVi && (
                <Text style={styles.defSub}>{d.definition}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {card.examples?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VÍ DỤ</Text>
          {card.examples.map((ex, i) => (
            <View key={i} style={styles.exItem}>
              <Text style={styles.exText}>“{ex.text}”</Text>
              {!!ex.textVi && <Text style={styles.exVi}>→ {ex.textVi}</Text>}
            </View>
          ))}
        </View>
      )}

      {noContent && (
        <Text style={styles.emptyText}>Thẻ này chưa có nghĩa/ví dụ.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  content: { gap: spacing.md, paddingBottom: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  term: { fontSize: 26, fontWeight: "700", color: colors.text },
  pos: {
    backgroundColor: colors.bg,
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  audioRow: { flexDirection: "row", gap: spacing.sm },
  ipaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  ipa: { fontSize: 14, color: colors.textMuted },
  ipaLabel: { fontWeight: "700", color: colors.textSubtle },
  meaning: { fontSize: 18, fontWeight: "600", color: colors.brandDark },
  note: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  noteLabel: { fontSize: 11, fontWeight: "700", color: "#d97706" },
  noteText: { fontSize: 14, color: "#92400e" },
  section: { gap: spacing.xs },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSubtle,
    letterSpacing: 0.5,
  },
  defItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  defPos: { fontSize: 12, color: colors.textSubtle },
  defText: { fontSize: 14, color: colors.text },
  defSub: { fontSize: 12, color: colors.textSubtle },
  exItem: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  exText: { fontSize: 14, fontStyle: "italic", color: colors.text },
  exVi: { fontSize: 13, color: colors.textMuted },
  emptyText: { fontSize: 14, color: colors.textSubtle },
});
