import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

export interface UserDevice {
  deviceId: string;
  name: string | null;
  platform: string | null;
  appVersion: string | null;
  lastIp: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Chính máy đang xem màn hình này. */
  isCurrent: boolean;
  /** Phiên đăng nhập của máy đó còn sống. */
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

/** Danh sách thiết bị đã đăng nhập của chính mình, mới nhất trước. */
export async function fetchDevices(): Promise<UserDevice[]> {
  const { data, error } = await supabase.rpc("list_user_devices");
  if (error) throw new Error(error.message);
  const thisDevice = await getDeviceId();
  return ((data ?? []) as DeviceRow[]).map((row) => ({
    deviceId: row.device_id,
    name: row.name,
    platform: row.platform,
    appVersion: row.app_version,
    lastIp: row.last_ip,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    // RPC so khớp theo session_id nên máy vừa đăng nhập lại (session mới, chưa
    // kịp ping) có thể lỡ nhịp — đối chiếu thêm device id lưu ở máy này.
    isCurrent: row.is_current || row.device_id === thisDevice,
    isActive: row.is_active,
  }));
}

/** Đăng xuất & gỡ một thiết bị khỏi tài khoản. */
export async function revokeDevice(deviceId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_user_device", {
    p_device_id: deviceId,
  });
  if (error) throw new Error(error.message);
}
