"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function ResetPasswordPage() {
  const busy = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setError(null);
    if (!updated && (password.length < 12 || password !== confirmation)) {
      setError("Mật khẩu cần ít nhất 12 ký tự và nhập lại trùng khớp.");
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const supabase = createClient();
      if (!updated) {
        // Xác thực với Auth server, không tin user đọc từ cookie/local storage.
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) throw new Error("invalid session");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setUpdated(true);
        setPassword("");
        setConfirmation("");
      }
      // Thu hồi refresh token trên mọi thiết bị sau khi đổi mật khẩu.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
      if (signOutError) throw signOutError;
      setDone(true);
    } catch {
      setError("Không thể hoàn tất. Liên kết có thể đã hết hạn; hãy thử lại hoặc yêu cầu liên kết mới.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return <main className="mx-auto max-w-md px-4 py-16">
    <h1 className="mb-5 text-2xl font-bold">Đặt lại mật khẩu</h1>
    {done ? <Alert variant="success">Đã đổi mật khẩu. Hãy đăng nhập lại.</Alert> :
      <form onSubmit={submit} className="space-y-3">
        {!updated && <>
          <Input type="password" autoComplete="new-password" aria-label="Mật khẩu mới"
            placeholder="Mật khẩu mới (ít nhất 12 ký tự)" minLength={12} required
            value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          <Input type="password" autoComplete="new-password" aria-label="Nhập lại mật khẩu"
            placeholder="Nhập lại mật khẩu" minLength={12} required
            value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={loading} />
        </>}
        {updated && <Alert variant="success">Mật khẩu đã đổi. Hoàn tất đăng xuất các thiết bị để tiếp tục.</Alert>}
        <Button type="submit" disabled={loading}>{updated ? "Thử lại đăng xuất các thiết bị" : "Lưu mật khẩu mới"}</Button>
      </form>}
    {error && <div className="mt-4"><Alert variant="error">{error}</Alert></div>}
    <Link className="mt-5 inline-block text-brand hover:underline" href="/login">Về trang đăng nhập</Link>
  </main>;
}
