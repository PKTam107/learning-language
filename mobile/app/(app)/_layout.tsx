import { useEffect } from "react";
import { Redirect, Stack, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Settings as SettingsIcon, TrendingUp } from "lucide-react-native";
import { useShareIntentContext } from "expo-share-intent";
import { useAuth } from "@/contexts/AuthContext";
import { configureNotificationHandler } from "@/lib/notifications";
import { type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

export default function AppLayout() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const { session, initializing, signOut } = useAuth();
  const router = useRouter();
  const { hasShareIntent } = useShareIntentContext();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  /**
   * Người dùng vừa chọn "Chia sẻ → LinguaCards" ở app khác. Chỉ đẩy sang màn
   * chia sẻ khi đã đăng nhập — chưa đăng nhập thì `Redirect` bên dưới đưa về
   * màn login trước, nội dung chia sẻ vẫn nằm trong provider nên quay lại đây
   * sau khi đăng nhập là đi tiếp được.
   */
  useEffect(() => {
    if (hasShareIntent && session) router.push("/share");
  }, [hasShareIntent, session, router]);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  // Chưa đăng nhập → đẩy về màn login.
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.brandDark,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "LinguaCards 🎴",
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => router.push("/progress")}
                hitSlop={8}
                accessibilityLabel="Tiến độ"
              >
                <TrendingUp size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => router.push("/settings")}
                hitSlop={8}
                accessibilityLabel="Cài đặt"
              >
                <SettingsIcon size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable onPress={signOut} hitSlop={8}>
                <Text style={styles.signOut}>Đăng xuất</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen name="decks/[id]" options={{ title: "Bộ thẻ" }} />
      <Stack.Screen name="study/[deckId]" options={{ title: "Học" }} />
      <Stack.Screen name="progress" options={{ title: "Tiến độ" }} />
      <Stack.Screen name="settings" options={{ title: "Cài đặt" }} />
      <Stack.Screen name="share" options={{ title: "Thêm từ được chia sẻ" }} />
    </Stack>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    signOut: { color: colors.textMuted, fontSize: 15 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  });
