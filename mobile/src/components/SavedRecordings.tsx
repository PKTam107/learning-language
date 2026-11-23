import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { listRecordings, removeRecording, shareRecording } from "@/lib/recordings";
import { Button } from "@/components/ui/Button";
import { useThemeColors } from "@/contexts/ThemeContext";
export function SavedRecordings() {
  const colors = useThemeColors();
  const [items, setItems] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(10);
  async function load() {
    setError("");
    try { setItems(await listRecordings()); } catch { setError("Chưa tải được bản thu đã lưu."); }
  }
  useFocusEffect(useCallback(() => {
    let alive = true;
    listRecordings().then((rows) => { if (alive) { setItems(rows); setError(""); } }).catch(() => { if (alive) setError("Chưa tải được bản thu đã lưu."); });
    return () => { alive = false; };
  }, []));
  async function remove(name: string) {
    setBusy(true); setError("");
    try { await removeRecording(name); setItems((list) => list.filter((item) => item !== name)); }
    catch { setError("Chưa xóa được bản thu. Hãy thử lại."); }
    finally { setBusy(false); }
  }
  async function share(name: string) {
    setBusy(true); setError("");
    try { await shareRecording(name); } catch { setError("Chưa xuất được bản thu. Hãy thử lại trên thiết bị hỗ trợ chia sẻ tập tin."); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Bản thu đã lưu ({items.length})</Text><Text style={{ color: colors.textMuted }}>Chỉ lưu trên thiết bị này, tách theo tài khoản. Xuất để nghe bằng ứng dụng khác hoặc lưu ra ngoài. Gỡ app/xóa dữ liệu ứng dụng sẽ xóa các bản lưu này.</Text><Button title="Tải lại danh sách bản thu" variant="secondary" disabled={busy} onPress={() => void load()} />
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
    {!items.length && <Text style={{ color: colors.textMuted }}>Chưa có bản thu đã lưu.</Text>}
    {items.slice(0, limit).map((name) => <View key={name} style={{ gap: 8 }}><Text style={{ color: colors.text }}>{new Date(Number(name.match(/\d+/)?.[0])).toLocaleString("vi-VN")}</Text><Button title="Xuất / nghe bằng ứng dụng khác" variant="secondary" disabled={busy} onPress={() => void share(name)} /><Button title="Xóa bản thu" variant="ghost" disabled={busy} onPress={() => Alert.alert("Xóa bản thu?", "Không thể hoàn tác bản thu đã xóa trên thiết bị này.", [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: () => { void remove(name); } }])} /></View>)}
    {items.length > limit && <Button title="Xem thêm bản thu" variant="secondary" onPress={() => setLimit(limit + 10)} />}
  </View>;
}
