import { useEffect, useMemo, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

/** Màu giấy vụn — khớp bản web (brand indigo trộn vài màu vui mắt). */
const COLORS = ["#4f46e5", "#818cf8", "#f59e0b", "#22c55e", "#f43f5e", "#38bdf8"];

interface Props {
  /** Số mảnh giấy. Nhiều quá thì rối, ~40 là vừa cho màn hình điện thoại. */
  pieces?: number;
  /** Thời gian bay (ms). */
  duration?: number;
}

/**
 * Hiệu ứng pháo giấy ăn mừng. Dùng Animated có sẵn của React Native nên không
 * thêm thư viện; mọi thuộc tính động đều chạy được trên native driver
 * (transform + opacity) nên không nghẽn JS thread.
 *
 * Mount là bắn — muốn bắn lại thì đổi `key` của component.
 */
export function Confetti({ pieces = 40, duration = 2600 }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  // Thông số mỗi mảnh cố định trong suốt vòng đời — random lại mỗi lần render
  // sẽ làm giấy nhảy lung tung.
  const flakes = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const fromLeft = i % 2 === 0;
        return {
          startX: width * (fromLeft ? 0.06 : 0.94),
          // Bắn chéo lên rồi rơi xuống: đích ngang lệch về phía giữa màn hình.
          driftX: (fromLeft ? 1 : -1) * (width * (0.25 + Math.random() * 0.5)),
          riseY: -height * (0.25 + Math.random() * 0.35),
          fallY: height * (0.7 + Math.random() * 0.5),
          size: 6 + Math.random() * 6,
          spin: 2 + Math.random() * 4,
          color: COLORS[i % COLORS.length],
        };
      }),
    [pieces, width, height]
  );

  useEffect(() => {
    let cancelled = false;

    // Người dùng bật "giảm chuyển động" ở hệ điều hành thì bỏ hẳn hiệu ứng.
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelled = true;
      progress.stopAnimation();
    };
  }, [progress, duration]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((f, i) => {
        // Chia [0..1] thành pha bay lên rồi pha rơi để có đường vòng cung.
        const translateY = progress.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, f.riseY, f.fallY],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, f.driftX],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${f.spin * 360}deg`],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: f.startX,
              top: height * 0.82,
              width: f.size,
              height: f.size * 1.6,
              borderRadius: 2,
              backgroundColor: f.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
