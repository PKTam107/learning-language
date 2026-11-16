import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { cardImageSource } from "@/lib/image-source";
import type { CardImage } from "@/lib/card-image";
import { searchImages } from "@/lib/api";
import { useImageSearch } from "@/hooks/useImageSearch";
import { useThemeColors } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CardPhoto } from "./CardPhoto";

export function ImagePicker({ term, image, onChange }: { term: string; image?: CardImage | null; onChange: (image: CardImage | null) => void }) {
  const colors = useThemeColors();
  const { height } = useWindowDimensions();
  const picker = useImageSearch(term, searchImages);
  return <View style={[styles.wrap, { borderColor: colors.border }]}>
    <Text style={{ color: colors.text, fontWeight: "600" }}>Ảnh minh họa (tùy chọn)</Text>
    <Text style={{ color: colors.textMuted }}>Chọn ảnh đúng với nghĩa bạn muốn học.</Text>
    <Button title={image ? "Đổi ảnh" : "Tìm ảnh"} onPress={picker.show} />
    {image && <><CardPhoto image={image} /><Pressable accessibilityRole="button" onPress={() => onChange(null)}><Text style={{ color: colors.brand }}>Bỏ ảnh đã chọn</Text></Pressable></>}
    <Modal open={picker.open} onClose={picker.close} title="Chọn ảnh minh họa" bodyDrag={false}>
      <View style={[styles.browser, { height: height * 0.65 }]}>
        <Input accessibilityLabel="Từ khóa tìm ảnh" placeholder="Nhập từ khóa tiếng Anh…" value={picker.query} onChangeText={picker.changeQuery} maxLength={100} returnKeyType="search" onSubmitEditing={() => void picker.search()} />
        <Button title="Tìm ảnh" disabled={picker.busy || !picker.query.trim()} onPress={() => void picker.search()} />
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cuộn để xem ảnh. Chọn một ảnh để dùng cho thẻ.</Text>
        <ScrollView style={styles.results} contentContainerStyle={styles.resultContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <View style={styles.grid}>{picker.images.map((photo, index) => {
            const selected = image?.id === photo.id && image?.source === photo.source;
            return <Pressable key={`${photo.source ?? "pexels"}-${photo.id}`} accessibilityRole="button" accessibilityLabel={`Chọn ảnh ${index + 1}: ${photo.alt}`} accessibilityState={{ selected }} onPress={() => { onChange(photo); picker.close(); }} style={[styles.option, { borderColor: selected ? colors.brand : colors.border }]}>
              <Image source={cardImageSource(photo)} accessibilityLabel={photo.alt || "Ảnh gợi ý"} style={styles.thumbnail} contentFit="contain" />
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 11 }}>{photo.photographer}</Text>
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 11 }}>{photo.source === "commons" ? photo.license : "Pexels"}</Text>
            </Pressable>;
          })}</View>
          {(picker.busy || !!picker.message) && <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted }}>{picker.busy ? "Đang tìm ảnh…" : picker.message}</Text>}
          {picker.cursor && <Button title={picker.busy ? "Đang tải…" : "Tải thêm ảnh"} disabled={picker.busy} variant="secondary" onPress={() => void picker.search(picker.cursor)} />}
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center" }}>Ảnh từ Wikimedia Commons</Text>
        </ScrollView>
        <Button title="Đóng" variant="secondary" onPress={picker.close} />
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  browser: { gap: 12 },
  results: { flex: 1 },
  resultContent: { gap: 12, paddingBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  option: { width: "48%", borderWidth: 2, borderRadius: 8, padding: 4, gap: 4 },
  thumbnail: { height: 120, width: "100%", borderRadius: 4 },
});
