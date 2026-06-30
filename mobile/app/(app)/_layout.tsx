import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  const { session, initializing, signOut } = useAuth();

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
            <Pressable onPress={signOut} hitSlop={8}>
              <Text style={styles.signOut}>Đăng xuất</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="decks/[id]" options={{ title: "Bộ thẻ" }} />
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
});
