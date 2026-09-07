import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LogOut, Monitor, Smartphone } from "lucide-react-native";
import { fetchDevices, revokeDevice, type UserDevice } from "@/lib/devices";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

/** "vừa xong" / "3 giờ trước" / "12/09" — đủ để nhận ra máy lạ. */
function lastSeen(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
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
 * Thiết bị đang/đã đăng nhập vào tài khoản. "Gỡ" là thu hồi phiên thật — máy đó
 * bị đá ra ở lần gia hạn token kế tiếp.
 */
export function DeviceList() {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const [devices, setDevices] = useState<UserDevice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchDevices()
      .then((list) => {
        setDevices(list);
        setFailed(false);
      })
      .catch(() => {
        setDevices([]);
        setFailed(true); // hay gặp nhất: chưa chạy migration 0010
      });
  }, []);

  useEffect(load, [load]);

  function confirmRevoke(device: UserDevice) {
    Alert.alert(
      "Đăng xuất thiết bị?",
      `"${device.name ?? "Thiết bị này"}" sẽ phải đăng nhập lại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gỡ",
          style: "destructive",
          onPress: async () => {
            setBusy(device.deviceId);
            try {
              await revokeDevice(device.deviceId);
              setDevices((list) =>
                (list ?? []).filter((d) => d.deviceId !== device.deviceId)
              );
            } catch (e) {
              Alert.alert("Không gỡ được", (e as Error).message);
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }

  if (!devices) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.card}>
        <Text style={styles.desc}>
          Chưa đọc được danh sách thiết bị. Nếu bạn tự chạy Supabase, kiểm tra đã
          chạy migration 0010_devices.sql chưa.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {devices.length === 0 && (
        <Text style={styles.desc}>
          Chưa ghi nhận thiết bị nào — mở lại app một lần là máy này xuất hiện.
        </Text>
      )}

      {devices.map((d, i) => {
        const mobile = d.platform === "ios" || d.platform === "android";
        return (
          <View key={d.deviceId}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <View style={styles.badge}>
                {mobile ? (
                  <Smartphone size={18} color={colors.textMuted} />
                ) : (
                  <Monitor size={18} color={colors.textMuted} />
                )}
              </View>

              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {d.name ?? "Thiết bị không rõ"}
                  {d.isCurrent ? " · máy này" : ""}
                </Text>
                <Text style={styles.desc} numberOfLines={1}>
                  {lastSeen(d.lastSeenAt)}
                  {d.appVersion ? ` · v${d.appVersion}` : ""}
                  {d.isActive ? "" : " · đã đăng xuất"}
                </Text>
              </View>

              {!d.isCurrent && (
                <Pressable
                  onPress={() => confirmRevoke(d)}
                  disabled={busy === d.deviceId}
                  accessibilityRole="button"
                  accessibilityLabel={`Đăng xuất ${d.name ?? "thiết bị"}`}
                  style={({ pressed }) => [
                    styles.revoke,
                    pressed && styles.pressed,
                  ]}
                >
                  {busy === d.deviceId ? (
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  ) : (
                    <LogOut size={15} color={colors.textMuted} />
                  )}
                  <Text style={styles.revokeText}>Gỡ</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: spacing.lg,
      gap: spacing.md,
    },
    center: { alignItems: "center", paddingVertical: spacing.xl },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    rowText: { flex: 1 },
    badge: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    name: { fontSize: 15, fontWeight: "600", color: colors.text },
    desc: { marginTop: 2, fontSize: 13, color: colors.textMuted },
    divider: { height: 1, marginBottom: spacing.md, backgroundColor: colors.border },
    revoke: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    pressed: { opacity: 0.7 },
    revokeText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  });
