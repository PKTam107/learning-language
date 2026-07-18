"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${siteUrl}/auth/callback` },
      });
      if (error) setError(error.message);
      else setInfo("Kiểm tra email để xác nhận tài khoản (nếu được bật).");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else window.location.href = "/dashboard";
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold">LinguaCards 🎴</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Đăng nhập để đồng bộ bộ thẻ của bạn
        </p>

        <Button
          onClick={signInWithGoogle}
          disabled={loading}
          variant="secondary"
          size="lg"
          className="mt-6 w-full"
        >
          {loading ? <Spinner /> : "🔓"} Tiếp tục với Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          hoặc dùng email
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Spinner />}
            {mode === "signin" ? "Đăng nhập" : "Đăng ký"}
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
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-brand hover:underline"
        >
          {mode === "signin"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </main>
  );
}
