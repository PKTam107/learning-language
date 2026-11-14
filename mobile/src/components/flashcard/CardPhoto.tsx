import { Image } from "expo-image";
import { cardImageSource } from "@/lib/image-source";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { parseCardImage } from "@/lib/card-image";
import { useThemeColors } from "@/contexts/ThemeContext";

export function CardPhoto({ image }: { image: unknown }) {
  const photo = parseCardImage(image);
  const colors = useThemeColors();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!photo) return null;
  const open = (url: string) => { void Linking.openURL(url).catch(() => {}); };
  return (
    <View style={styles.wrap}>
      {failedUrl === photo.url ? <Text style={{ color: colors.textMuted }}>Không tải được ảnh. Bạn vẫn có thể học bằng nội dung thẻ.</Text> : (
        <Image source={cardImageSource(photo)} accessibilityLabel={photo.alt || "Ảnh minh họa"} contentFit="contain" style={styles.photo} onError={() => setFailedUrl(photo.url)} />
      )}
      <Pressable accessibilityRole="link" onPress={() => open(photo.pageUrl)}>
        <Text style={[styles.credit, { color: colors.textMuted }]}>Ảnh: {photo.photographer} / {photo.source === "commons" ? "Wikimedia Commons" : "Pexels"}</Text>
      </Pressable>
      {photo.source === "commons" && <Pressable accessibilityRole="link" onPress={() => open(photo.licenseUrl)}><Text style={[styles.credit, { color: colors.textMuted }]}>{photo.license}</Text></Pressable>}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 4 },
  photo: { width: "100%", height: 150, borderRadius: 8 },
  credit: { fontSize: 11, textAlign: "center", textDecorationLine: "underline" },
});
