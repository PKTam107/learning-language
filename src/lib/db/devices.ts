"use client";

import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";

export interface UserDevice {
  deviceId: string;
  name: string | null;
  platform: string | null;
  appVersion: string | null;
  lastIp: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Chính máy đang xem trang này. */
  isCurrent: boolean;
  /** Phiên đăng nhập của máy đó còn sống (chưa hết hạn / chưa bị thu hồi). */
  isActive: boolean;
}

interface DeviceRow {
  device_id: string;
  name: string | null;
  platform: string | null;
  app_version: string | null;
  last_ip: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_current: boolean;
  is_active: boolean;
}

function toDevice(row: DeviceRow): UserDevice {
  return {
    deviceId: row.device_id,
    name: row.name,
    platform: row.platform,
    appVersion: row.app_version,
    lastIp: row.last_ip,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    // RPC so khớp theo session_id nên máy đã đăng nhập lại (session mới, chưa
    // kịp ping) có thể lỡ nhịp — đối chiếu thêm device id lưu ở máy này.
    isCurrent: row.is_current || row.device_id === getDeviceId(),
    isActive: row.is_active,
  };
}

/** Danh sách thiết bị đã đăng nhập của chính mình, mới nhất trước. */
export async function fetchDevices(): Promise<UserDevice[]> {
  const { data, error } = await createClient().rpc("list_user_devices");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DeviceRow[]).map(toDevice);
}

/** Đăng xuất & gỡ một thiết bị khỏi danh sách. */
export async function revokeDevice(deviceId: string): Promise<void> {
  const { error } = await createClient().rpc("revoke_user_device", {
    p_device_id: deviceId,
  });
  if (error) throw new Error(error.message);
}
