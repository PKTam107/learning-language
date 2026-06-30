import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "@/types";
import { colors, radius, spacing } from "@/lib/theme";

interface Props {
  card: Card;
  onDelete: (card: Card) => void;
}

export function CardRow({ card, onDelete }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <View style={styles.termLine}>
          <Text style={styles.term}>{card.term}</Text>
          {!!card.phonetic && (
            <Text style={styles.phonetic}>{card.phonetic}</Text>
          )}
        </View>
        <Text style={styles.meaning} numberOfLines={2}>
          {card.part_of_speech ? (
            <Text style={styles.pos}>({card.part_of_speech}) </Text>
          ) : null}
          {card.meaning_vi || "—"}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(card)}
        hitSlop={8}
        style={styles.iconBtn}
        accessibilityLabel="Xóa từ"
      >
        <Text style={styles.icon}>🗑️</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1, minWidth: 0 },
  termLine: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  term: { fontSize: 16, fontWeight: "700", color: colors.text },
  phonetic: { fontSize: 14, color: colors.textSubtle },
  meaning: { marginTop: 2, fontSize: 14, color: colors.textMuted },
  pos: { color: colors.textSubtle },
  iconBtn: { padding: 4 },
  icon: { fontSize: 16 },
});
