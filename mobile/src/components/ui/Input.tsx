import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { radius, type ThemeColors } from "@/lib/theme";
import { useStyles, useThemeColors } from "@/contexts/ThemeContext";

export const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { style, ...rest },
  ref
) {
  const colors = useThemeColors();
  const styles = useStyles(makeStyles);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textSubtle}
      style={[styles.input, style]}
      {...rest}
    />
  );
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
    },
  });
