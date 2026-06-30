import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { colors, radius } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends PressableProps {
  title: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...rest
}: Props) {
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
      <Text style={[styles.text, variant !== "primary" && styles.textDark]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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

const variantStyle = StyleSheet.create({
  primary: { backgroundColor: colors.brand },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: "transparent" },
});
