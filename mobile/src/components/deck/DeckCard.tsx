import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Deck } from "@/types";
import { StatusBar } from "@/components/status/StatusBar";
import { colors, radius, spacing } from "@/lib/theme";

interface Props {
  deck: Deck;
  onPress: (deck: Deck) => void;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}

export function DeckCard({ deck, onPress, onEdit, onDelete }: Props) {
  return (
    <Pressable
      onPress={() => onPress(deck)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {deck.name}
          </Text>
          {!!deck.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {deck.description}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => onEdit(deck)}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityLabel="Sửa"
          >
            <Text style={styles.icon}>✏️</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(deck)}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityLabel="Xóa"
          >
            <Text style={styles.icon}>🗑️</Text>
          </Pressable>
        </View>
      </View>

      {!!deck.stats && deck.stats.total > 0 && (
        <StatusBar stats={deck.stats} showLegend={false} />
      )}

      <Text style={styles.count}>
        {deck.card_count ?? 0} từ
        {!!deck.stats && deck.stats.total > 0 && (
          <Text> · {deck.stats.byStatus.easy} đã thuộc</Text>
        )}
        {!!deck.stats && deck.stats.due > 0 && (
          <Text style={styles.due}> · {deck.stats.due} cần ôn</Text>
        )}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  desc: { marginTop: 2, fontSize: 14, color: colors.textMuted },
  actions: { flexDirection: "row", marginLeft: spacing.sm },
  iconBtn: { padding: 4 },
  icon: { fontSize: 16 },
  count: { fontSize: 14, color: colors.textMuted },
  due: { color: "#d97706" }, // amber-600
});
