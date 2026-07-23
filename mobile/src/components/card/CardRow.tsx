import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card, CardStatus } from "@/types";
import { StatusDot } from "@/components/status/StatusDot";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { colors, radius, spacing } from "@/lib/theme";
import { Check, Trash2 } from "lucide-react-native";

interface Props {
  card: Card;
  status?: CardStatus;
  onDelete: (card: Card) => void;
  /** Bấm vào từ để xem chi tiết (chỉ khi không ở chế độ chọn). */
  onPress?: (card: Card) => void;
  /** Chế độ chọn nhiều thẻ. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (card: Card) => void;
}

export function CardRow({
  card,
  status,
  onDelete,
  onPress,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const info = (
    <View style={styles.info}>
      <View style={styles.termLine}>
        {!selectMode && status && <StatusDot status={status} />}
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
  );

  return (
    <View style={[styles.row, selectMode && selected && styles.rowSelected]}>
      {selectMode && (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected && <Check size={14} color="#fff" strokeWidth={3} />}
        </View>
      )}

      {selectMode ? (
        <Pressable style={styles.infoWrap} onPress={() => onToggleSelect?.(card)}>
          {info}
        </Pressable>
      ) : (
        <Pressable
          style={styles.infoWrap}
          onPress={() => onPress?.(card)}
          accessibilityLabel={`Xem chi tiết ${card.term}`}
        >
          {info}
        </Pressable>
      )}

      {!selectMode && (
        <View style={styles.actions}>
          <AudioButton url={card.audio_us} text={card.term} label="US" />
          <Pressable
            onPress={() => onDelete(card)}
            hitSlop={8}
            style={styles.iconBtn}
            accessibilityLabel="Xóa từ"
          >
            <Trash2 size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      )}
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
  rowSelected: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  infoWrap: { flex: 1, minWidth: 0 },
  info: { flex: 1, minWidth: 0 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  termLine: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  term: { fontSize: 16, fontWeight: "700", color: colors.text },
  phonetic: { fontSize: 14, color: colors.textSubtle },
  meaning: { marginTop: 2, fontSize: 14, color: colors.textMuted },
  pos: { color: colors.textSubtle },
  iconBtn: { padding: 4 },
  icon: { fontSize: 16 },
});
