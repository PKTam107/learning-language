import { View } from "react-native";
import type { CardStatus } from "@/types";
import { STATUS_META } from "@/lib/status";

/** Chấm màu trạng thái học của 1 thẻ. */
export function StatusDot({
  status,
  size = 10,
}: {
  status: CardStatus;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: STATUS_META[status].color,
      }}
    />
  );
}
