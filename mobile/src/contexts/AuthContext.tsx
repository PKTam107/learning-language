import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { getQueryParams } from "expo-auth-session/build/QueryParams";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** true cho tới khi đã đọc xong session đã lưu (tránh nháy màn login). */
  initializing: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      async signUpWithPassword(email, password) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      async signInWithGoogle() {
        // Deep link quay lại app sau khi Google xác thực xong.
        // Phải khớp Redirect URL đã khai báo trong Supabase dashboard.
        const redirectTo = makeRedirectUri({
          scheme: "linguacards",
          path: "auth/callback",
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("Không tạo được URL đăng nhập Google.");

        // Mở trình duyệt hệ thống; trả về khi redirect về scheme của app.
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );
        if (result.type !== "success") {
          // Người dùng đóng/hủy — không coi là lỗi.
          if (result.type === "cancel" || result.type === "dismiss") return;
          throw new Error("Đăng nhập Google không hoàn tất.");
        }

        // PKCE: URL trả về mang ?code=... → đổi lấy session.
        const { params, errorCode } = getQueryParams(result.url);
        if (errorCode) throw new Error(errorCode);
        const code = params.code;
        if (!code) throw new Error("Thiếu authorization code từ Google.");

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        // onAuthStateChange cập nhật session → (auth)/_layout redirect vào app.
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong <AuthProvider>");
  return ctx;
}
