import { useEffect } from "react";
import { Redirect, Stack, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Settings as SettingsIcon } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { configureNotificationHandler } from "@/lib/notifications";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  const { session, initializing, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    configureNotificationHandler();
  }, []);

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
      <Stack.Screen name="settings" options={{ title: "Cài đặt" }} />
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
});
