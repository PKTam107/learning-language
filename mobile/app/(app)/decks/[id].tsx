import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/lib/theme";

/**
 * Placeholder màn chi tiết bộ thẻ.
 * Feature 3 sẽ thay bằng danh sách card + thêm/xóa.
 */
export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Danh sách card</Text>
      <Text style={styles.note}>
        Sẽ được thêm ở Feature 3.{"\n"}Deck id: {id}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  note: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textMuted,
    lineHeight: 20,
  },
});
