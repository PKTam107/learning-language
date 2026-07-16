import { useEffect } from "react";
import { Redirect, Stack, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  const { session, initializing, signOut } = useAuth();
  const router = useRouter();

  // Chạm vào thông báo nhắc ôn → mở màn chính (danh sách bộ thẻ để học).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate("/(app)");
    });
    return () => sub.remove();
  }, [router]);

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
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push("/(app)/settings")}
                hitSlop={8}
                accessibilityLabel="Cài đặt nhắc ôn"
              >
                <Text style={styles.headerIcon}>🔔</Text>
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
      <Stack.Screen name="settings" options={{ title: "Nhắc ôn" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  signOut: { color: colors.textMuted, fontSize: 15 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerIcon: { fontSize: 18 },
});
