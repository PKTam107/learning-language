import Constants, { ExecutionEnvironment } from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ShareIntentProvider } from "expo-share-intent";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

/**
 * Nhận "Chia sẻ → LinguaCards" cần **mã native**, mà Expo Go thì không có nó —
 * bật lên trong Expo Go chỉ tổ ném lỗi lúc khởi động. Tính năng này vì vậy chỉ
 * sống trong bản build thật (APK/EAS); chạy `expo start` vẫn dùng app bình
 * thường, chỉ thiếu lối vào chia sẻ.
 */
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function RootLayout() {
  return (
    // ShareIntentProvider phải nằm NGOÀI mọi provider khác (yêu cầu của thư
    // viện: nó móc vào deep link trước khi phần còn lại của app dựng xong).
    <ShareIntentProvider options={{ disabled: IS_EXPO_GO }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <ThemedStack />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}

/**
 * Tách riêng khỏi RootLayout vì phần này **tiêu thụ** theme, mà RootLayout lại
 * là nơi dựng <ThemeProvider> — component không đọc được context do chính nó
 * render ra.
 */
function ThemedStack() {
  const { colors, scheme } = useTheme();

  return (
    <>
      {/* Nền tối thì chữ trên thanh trạng thái phải sáng, và ngược lại. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.brandDark,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
