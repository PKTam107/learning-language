"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const busy = useRef(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signInWithGoogle() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError("Không thể đăng nhập Google. Vui lòng thử lại.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    setError(null);
    setInfo(null);
    if (mode === "signup" && (password.length < 12 || password !== confirmation)) {
      setError("Mật khẩu cần ít nhất 12 ký tự và nhập lại trùng khớp.");
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const supabase = createClient();
      const callback = `${window.location.origin}/auth/callback`;
      if (mode === "recover") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${callback}?next=/auth/reset-password`,
        });
        if (error) throw error;
        setInfo("Nếu email có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu. Mở liên kết trên trình duyệt này.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: callback },
        });
        if (error) throw error;
        if (data.session) window.location.replace("/dashboard");
        else setInfo("Nếu đủ điều kiện đăng ký, bạn sẽ nhận được email xác nhận. Mở liên kết trên trình duyệt này.");
        setPassword("");
        setConfirmation("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        window.location.replace("/dashboard");
      }
    } catch {
      setError(mode === "signin"
        ? "Không thể đăng nhập. Kiểm tra email, mật khẩu và trạng thái xác nhận email, hoặc thử lại sau."
        : "Không thể hoàn tất yêu cầu. Vui lòng thử lại sau.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
        <h1 className="text-center text-2xl font-bold">LinguaCards 🎴</h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Đăng nhập để đồng bộ bộ thẻ của bạn
        </p>

        <Button
          onClick={signInWithGoogle}
          disabled={loading}
          variant="secondary"
          size="lg"
          className="mt-6 w-full"
        >
          {loading ? <Spinner /> : <LogIn className="h-[18px] w-[18px]" />} Tiếp tục với Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          hoặc dùng email
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <Input
            autoComplete="email"
            aria-label="Email"
            disabled={loading}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== "recover" && <Input
            aria-label="Mật khẩu"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            disabled={loading}
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 12 : 1}
          />}
          {mode === "signup" && <Input
            type="password" autoComplete="new-password" aria-label="Nhập lại mật khẩu"
            placeholder="Nhập lại mật khẩu (ít nhất 12 ký tự)" value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)} required minLength={12} disabled={loading}
          />}
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Spinner />}
            {mode === "signin" ? "Đăng nhập" : mode === "signup" ? "Đăng ký" : "Gửi liên kết đặt lại mật khẩu"}
          </Button>
        </form>

        {(error || info) && (
          <div className="mt-4 space-y-2">
            {error && (
              <Alert variant="error" title="Đăng nhập không thành công">
                {error}
              </Alert>
            )}
            {info && <Alert variant="success">{info}</Alert>}
          </div>
        )}

        <button
          disabled={loading}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setPassword(""); setConfirmation(""); setError(null); setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm text-brand dark:text-indigo-400 hover:underline"
        >
          {mode === "signin"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
        {mode === "signin" && <button disabled={loading}
          onClick={() => { setMode("recover"); setPassword(""); setError(null); setInfo(null); }}
          className="mt-3 w-full text-center text-sm text-brand hover:underline">
          Quên mật khẩu?
        </button>}
      </div>
    </main>
  );
}
