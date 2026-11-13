import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CardImage } from "@/lib/card-image";
import { searchImages } from "@/lib/api";
import { useThemeColors } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/Input";
import { CardPhoto } from "./CardPhoto";

export function ImagePicker({ term, image, onChange }: { term: string; image?: CardImage | null; onChange: (image: CardImage | null) => void }) {
  const colors = useThemeColors();
  const [query, setQuery] = useState(term);
  const [images, setImages] = useState<CardImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  async function search() {
    const request = ++version.current;
    setBusy(true); setMessage(""); setImages([]);
    try {
      const results = await searchImages(query.trim());
      if (request !== version.current) return;
      setImages(results);
      if (!results.length) setMessage("Chưa có ảnh phù hợp. Thử từ khóa khác hoặc bỏ qua ảnh.");
    } catch (error) {
      if (request === version.current) setMessage(error instanceof Error ? error.message : "Không tìm được ảnh.");
    } finally { if (request === version.current) setBusy(false); }
  }
  return <View style={[styles.wrap, { borderColor: colors.border }]}>
    <Text style={{ color: colors.text, fontWeight: "600" }}>Ảnh minh họa (tùy chọn)</Text>
    <Text style={{ color: colors.textMuted }}>Chọn ảnh đúng với nghĩa bạn muốn học.</Text>
    <Input accessibilityLabel="Từ khóa tìm ảnh" value={query} onChangeText={setQuery} maxLength={100} onSubmitEditing={() => { if (!busy && query.trim()) void search(); }} />
    <Pressable accessibilityRole="button" disabled={busy || !query.trim()} onPress={() => void search()} style={{ opacity: busy || !query.trim() ? 0.5 : 1 }}><Text style={{ color: colors.brand }}>{busy ? "Đang tìm…" : "Tìm ảnh"}</Text></Pressable>
    {image && <><CardPhoto image={image} /><Pressable accessibilityRole="button" onPress={() => onChange(null)}><Text style={{ color: colors.brand }}>Bỏ ảnh đã chọn</Text></Pressable></>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted }}>{message}</Text>}
    <View style={styles.grid}>{images.map((photo, index) => {
      const selected = image?.id === photo.id && image?.source === photo.source;
      return <Pressable key={`${photo.source}-${photo.id}`} accessibilityRole="button" accessibilityLabel={`Chọn ảnh ${index + 1}`} accessibilityState={{ selected }} onPress={() => onChange(photo)} style={[styles.option, { borderColor: selected ? colors.brand : colors.border }]}>
        <Image source={{ uri: photo.url }} style={styles.thumbnail} resizeMode="cover" />
        <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: 11 }}>{photo.photographer}</Text>
      </Pressable>;
    })}</View>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { width: "48%", borderWidth: 2, borderRadius: 8, padding: 4, gap: 4 },
  thumbnail: { height: 100, width: "100%", borderRadius: 4 },
});
