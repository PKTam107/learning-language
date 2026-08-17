import { View } from "react-native";
import type { CardStatus } from "@/types";
import { statusColor } from "@/lib/status";
import { useThemeColors } from "@/contexts/ThemeContext";

/** Chấm màu trạng thái học của 1 thẻ. */
export function StatusDot({
  status,
  size = 10,
}: {
  status: CardStatus;
  size?: number;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: statusColor(status, colors),
      }}
    />
  );
}
