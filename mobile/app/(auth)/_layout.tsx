import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLayout() {
  const { session, initializing } = useAuth();

  // Đã đăng nhập thì không cho vào lại màn auth.
  if (!initializing && session) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
