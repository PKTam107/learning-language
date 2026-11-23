import { useEffect } from "react";
import { Redirect, Stack, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useShareIntentContext } from "expo-share-intent";
import { useAuth } from "@/contexts/AuthContext";
import { configureNotificationHandler } from "@/lib/notifications";
import { type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function AppLayout() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const { session, initializing } = useAuth();
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="decks/[id]" options={{ title: "Bộ thẻ" }} />
      <Stack.Screen name="study/[deckId]" options={{ title: "Học" }} />
      <Stack.Screen name="mining" options={{ title: "Thêm từ từ đoạn văn" }} />
      <Stack.Screen name="speaking" options={{ title: "Luyện nói theo câu mẫu" }} />
      <Stack.Screen name="health" options={{ title: "Sức khỏe kho thẻ" }} />
      <Stack.Screen name="dictation" options={{ title: "Nghe chép chính tả" }} />
      <Stack.Screen name="reading" options={{ title: "Đọc hiểu" }} />
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
  });
