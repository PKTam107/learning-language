import { Tabs } from "expo-router";
import { Home, GraduationCap, Layers, TrendingUp, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/contexts/ThemeContext";
import { APP_TABS } from "@/lib/navigation";

const icons = { index: Home, learn: GraduationCap, decks: Layers, progress: TrendingUp, settings: Settings };

export default function TabLayout() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs backBehavior="history" screenOptions={{
      headerStyle: { backgroundColor: colors.card },
      headerTintColor: colors.brandDark,
      headerTitleStyle: { fontWeight: "700" },
      tabBarActiveTintColor: colors.brand,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 58 + bottom, paddingTop: 6, paddingBottom: bottom },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      tabBarHideOnKeyboard: true,
    }}>
      {APP_TABS.map((tab) => {
        const Icon = icons[tab.name];
        return <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          headerTitle: tab.name === "index" ? "LinguaCards 🎴" : tab.title,
          tabBarAccessibilityLabel: tab.title,
          tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
        }} />;
      })}
    </Tabs>
  );
}
