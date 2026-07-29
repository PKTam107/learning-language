import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";
import { useSheetDrag } from "./Modal";
import { colors, radius, spacing } from "@/lib/theme";

const ITEM_H = 44;
/** Số dòng thấy được (lẻ để có 1 dòng ở giữa). */
const VISIBLE = 5;
const PAD = ITEM_H * ((VISIBLE - 1) / 2);

interface Props {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  /** Cách hiển thị mỗi giá trị (mặc định: số nguyên 2 chữ số). */
  format?: (value: number) => string;
  accessibilityLabel?: string;
}

/**
 * Bánh xe chọn số kiểu iOS: cuộn và tự nam châm về dòng giữa, các dòng xa tâm
 * mờ & nhỏ dần. Không cần thư viện ngoài — chỉ ScrollView + Animated.
 */
export function WheelPicker({
  values,
  value,
  onChange,
  format = (v) => String(v).padStart(2, "0"),
  accessibilityLabel,
}: Props) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const index = Math.max(0, values.indexOf(value));
  /** Vị trí ta đã tự đồng bộ — tránh scrollTo đè lên chính cử chỉ của người dùng. */
  const synced = useRef(index);
  const drag = useSheetDrag();

  // Bánh xe tự cuộn → tắt cử chỉ kéo-đóng ở thân sheet (grabber vẫn kéo được).
  useEffect(() => {
    drag?.setBodyDragEnabled(false);
  }, [drag]);

  // Giá trị đổi từ bên ngoài (ví dụ bấm gợi ý nhanh) → cuộn tới đúng dòng.
  useEffect(() => {
    if (synced.current === index) return;
    synced.current = index;
    scrollRef.current?.scrollTo({ y: index * ITEM_H, animated: true });
  }, [index]);

  function settle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const i = Math.min(values.length - 1, Math.max(0, raw));
    synced.current = i;
    if (values[i] !== value) onChange(values[i]);
  }

  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
      <View pointerEvents="none" style={styles.band} />
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        disableIntervalMomentum
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={styles.list}
        onLayout={() =>
          scrollRef.current?.scrollTo({ y: index * ITEM_H, animated: false })
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
      >
        {values.map((v, i) => {
          const range = [
            (i - 2) * ITEM_H,
            (i - 1) * ITEM_H,
            i * ITEM_H,
            (i + 1) * ITEM_H,
            (i + 2) * ITEM_H,
          ];
          const opacity = scrollY.interpolate({
            inputRange: range,
            outputRange: [0.2, 0.5, 1, 0.5, 0.2],
            extrapolate: "clamp",
          });
          const scale = scrollY.interpolate({
            inputRange: range,
            outputRange: [0.78, 0.9, 1, 0.9, 0.78],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={v}
              style={[styles.item, { opacity, transform: [{ scale }] }]}
            >
              <Text style={styles.itemText}>{format(v)}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

export const WHEEL_HEIGHT = ITEM_H * VISIBLE;

const styles = StyleSheet.create({
  wrap: { height: WHEEL_HEIGHT, flex: 1, justifyContent: "center" },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_H,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
  },
  list: { paddingVertical: PAD },
  item: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
  itemText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    paddingHorizontal: spacing.sm,
  },
});
