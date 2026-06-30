import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors, radius } from "@/lib/theme";

export const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { style, ...rest },
  ref
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textSubtle}
      style={[styles.input, style]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
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
