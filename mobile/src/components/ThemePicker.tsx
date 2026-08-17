import { Pressable, StyleSheet, Text, View } from "react-native";
import { Monitor, Moon, Sun } from "lucide-react-native";
import { radius, spacing, type ThemeColors } from "@/lib/theme";
import { useStyles, useTheme, type ThemeChoice } from "@/contexts/ThemeContext";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
  { value: "system", label: "Theo máy", Icon: Monitor },
];

/** Bộ chọn giao diện 3 nhánh cho màn Cài đặt. */
export function ThemePicker() {
  const { choice, colors, setChoice } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <Pressable
            key={value}
            onPress={() => setChoice(value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.option,
              active && styles.optionActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon size={20} color={active ? colors.brandDark : colors.textMuted} />
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: spacing.sm },
    option: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    optionActive: {
      borderColor: colors.brand,
      backgroundColor: colors.brandLight,
    },
    pressed: { opacity: 0.7 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    labelActive: { color: colors.brandDark },
  });
