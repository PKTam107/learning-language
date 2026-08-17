import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import type { ReactNode } from "react";
import { radius, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends PressableProps {
  title: string;
  variant?: Variant;
  loading?: boolean;
  /** Icon tùy chọn, hiển thị trước tiêu đề. */
  icon?: ReactNode;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: Props) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  const variantStyle = useStyles(makeVariantStyle);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        variantStyle[variant],
        (isDisabled || state.pressed) && styles.dim,
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : colors.brand}
        />
      )}
      {!loading && icon}
      <Text style={[styles.text, variant !== "primary" && styles.textDark]}>
        {title}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: radius.md,
    },
    dim: { opacity: 0.6 },
    text: { color: "#fff", fontSize: 16, fontWeight: "600" },
    textDark: { color: colors.text },
  });

const makeVariantStyle = (colors: ThemeColors) =>
  StyleSheet.create({
    primary: { backgroundColor: colors.brand },
    secondary: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: { backgroundColor: "transparent" },
  });
