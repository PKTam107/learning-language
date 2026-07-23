import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radius, spacing } from "@/lib/theme";
import { LogIn } from "lucide-react-native";

// Hoàn tất phiên auth còn treo (nếu app bị mở lại giữa chừng OAuth).
WebBrowser.maybeCompleteAuthSession();

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setInfo(null);

    if (!email.trim() || password.length < 6) {
      setError("Nhập email và mật khẩu (tối thiểu 6 ký tự).");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithPassword(email.trim(), password);
        setInfo("Kiểm tra email để xác nhận tài khoản (nếu được bật).");
      } else {
        await signInWithPassword(email.trim(), password);
        // Đăng nhập thành công → AuthProvider cập nhật session,
        // (auth)/_layout tự redirect sang (app).
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>LinguaCards 🎴</Text>
          <Text style={styles.subtitle}>
            Đăng nhập để đồng bộ bộ thẻ của bạn
          </Text>

          <Button
            title="Tiếp tục với Google"
            icon={<LogIn size={18} color={colors.text} />}
            variant="secondary"
            onPress={handleGoogle}
            loading={googleLoading}
            disabled={loading}
            style={styles.googleBtn}
          />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>hoặc dùng email</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.form}>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
            <Button
              title={mode === "signin" ? "Đăng nhập" : "Đăng ký"}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <Text
            style={styles.switch}
            onPress={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "signin"
              ? "Chưa có tài khoản? Đăng ký"
              : "Đã có tài khoản? Đăng nhập"}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
  },
  googleBtn: { marginTop: spacing.xl },
  divider: {
    marginVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textSubtle, fontSize: 12 },
  form: { gap: spacing.md },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: 14 },
  info: { marginTop: spacing.md, color: colors.success, fontSize: 14 },
  switch: {
    marginTop: spacing.lg,
    textAlign: "center",
    color: colors.brand,
    fontSize: 14,
  },
});
