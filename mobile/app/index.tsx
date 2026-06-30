import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/lib/theme";

/** Cổng điều hướng gốc: chờ đọc session rồi đưa vào (app) hoặc (auth). */
export default function Index() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return <Redirect href={session ? "/(app)" : "/(auth)/login"} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
