"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, Monitor, Smartphone } from "lucide-react";
import { fetchDevices, revokeDevice, type UserDevice } from "@/lib/db/devices";
import { Spinner } from "@/components/ui/Spinner";

/** "vừa xong" / "3 giờ trước" / "12/09" — đủ để nhận ra máy lạ. */
function lastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 2) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Thiết bị đang/đã đăng nhập vào tài khoản. Bấm gỡ là **thu hồi phiên thật** —
 * xóa dòng auth.sessions nên máy đó bị đá ra ở lần gia hạn token kế tiếp.
 */
export function DeviceList() {
  const [devices, setDevices] = useState<UserDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchDevices()
      .then((list) => {
        setDevices(list);
        setError(null);
      })
      .catch((e: Error) => {
        setDevices([]);
        // Hay gặp nhất: chưa chạy migration 0010 trên project Supabase.
        setError(e.message);
      });
  }, []);

  useEffect(load, [load]);

  async function handleRevoke(device: UserDevice) {
    if (
      !confirm(
        `Đăng xuất "${device.name ?? "thiết bị này"}" khỏi tài khoản? Máy đó sẽ phải đăng nhập lại.`
      )
    ) {
      return;
    }
    setBusy(device.deviceId);
    setError(null);
    try {
      await revokeDevice(device.deviceId);
      setDevices((list) =>
        (list ?? []).filter((d) => d.deviceId !== device.deviceId)
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!devices) {
    return (
      <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  // Chỉ khi CHƯA đọc được danh sách mới thay cả khối bằng lời nhắc; lỗi lúc gỡ
  // hiện thành một dòng phía trên (bên dưới) để không xóa mất danh sách.
  if (error && devices.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Chưa đọc được danh sách thiết bị. Nếu bạn tự chạy Supabase, kiểm tra đã
        chạy migration <code>0010_devices.sql</code> chưa.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {error && (
        <p className="bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          Không gỡ được thiết bị: {error}
        </p>
      )}

      {devices.length === 0 && (
        <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
          Chưa ghi nhận thiết bị nào — mở lại app một lần là máy này xuất hiện.
        </p>
      )}

      {devices.map((d) => {
        const mobile = d.platform === "ios" || d.platform === "android";
        return (
          <div key={d.deviceId} className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {mobile ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {d.name ?? "Thiết bị không rõ"}
                {d.isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark dark:bg-indigo-500/15 dark:text-indigo-300">
                    Máy này
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {lastSeen(d.lastSeenAt)}
                {d.lastIp ? ` · ${d.lastIp}` : ""}
                {d.appVersion ? ` · v${d.appVersion}` : ""}
                {!d.isActive && " · đã đăng xuất"}
              </p>
            </div>

            {!d.isCurrent && (
              <button
                type="button"
                onClick={() => handleRevoke(d)}
                disabled={busy === d.deviceId}
                aria-label={`Đăng xuất ${d.name ?? "thiết bị"}`}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {busy === d.deviceId ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                Gỡ
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
