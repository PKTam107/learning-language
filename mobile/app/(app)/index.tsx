import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing } from "@/lib/theme";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.hello}>Xin chào 👋</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.note}>
            Bạn đã đăng nhập. Màn “Bộ thẻ” sẽ được thêm ở bước tiếp theo.
          </Text>
        </View>

        <Button title="Đăng xuất" variant="secondary" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  hello: { fontSize: 20, fontWeight: "700", color: colors.text },
  email: { fontSize: 16, color: colors.brandDark, fontWeight: "600" },
  note: { marginTop: spacing.sm, color: colors.textMuted, lineHeight: 20 },
});
