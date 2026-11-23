import { ScrollView } from "react-native";
import { WordMining } from "@/components/WordMining";
import { useThemeColors } from "@/contexts/ThemeContext";
export default function MiningScreen() {
  const colors = useThemeColors();
  return <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled"><WordMining /></ScrollView>;
}
