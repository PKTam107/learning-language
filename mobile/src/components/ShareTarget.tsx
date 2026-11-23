import { Text, View } from "react-native";
import { WordMining } from "@/components/WordMining";
import { QuickCreator } from "@/components/QuickCreator";
import { parseSharedText } from "@/lib/share-text";
import { useThemeColors } from "@/contexts/ThemeContext";
export function ShareTarget({ shared, onDone }: { shared: string; onDone?: () => void }) {
  const colors = useThemeColors();
  const parsed = parseSharedText(shared);
  if (parsed.text && !parsed.isSingleTerm) return <View style={{ padding: 16 }}><WordMining initialText={shared} /></View>;
  if (!parsed.term) return <Text style={{ padding: 16, color: colors.textMuted }}>Không nhận được nội dung. Hãy bôi đen từ ở app khác rồi chọn Chia sẻ → LinguaCards.</Text>;
  return <View style={{ padding: 16, gap: 16 }}><Text style={{ color: colors.textMuted }}>Đang tra từ bạn vừa chia sẻ.</Text><Text style={{ color: colors.text }}>{parsed.text}</Text><QuickCreator key={parsed.term} initialWord={parsed.term} autoOpen hideFab onClose={onDone} /></View>;
}
