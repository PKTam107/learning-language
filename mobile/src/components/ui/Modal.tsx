import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal as RNModal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PanResponderGestureState,
  type ScrollViewProps,
} from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

/** Kéo quá khoảng này (px) hoặc vuốt nhanh hơn ngưỡng vận tốc → đóng sheet. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.6;
/** Khoảng dịch khi animate sheet trượt hẳn xuống dưới màn hình. */
const EXIT_OFFSET = 700;

interface SheetDragApi {
  /**
   * Bật/tắt cử chỉ kéo-đóng ở phần thân sheet. Nội dung tự cuộn (ScrollView,
   * wheel picker...) tắt nó đi để không tranh chấp cử chỉ; thanh grabber ở đầu
   * sheet thì luôn kéo được.
   */
  setBodyDragEnabled: (enabled: boolean) => void;
}

const SheetDragContext = createContext<SheetDragApi | null>(null);

/** Hook cho nội dung bên trong sheet điều khiển cử chỉ kéo-đóng. */
export function useSheetDrag(): SheetDragApi | null {
  return useContext(SheetDragContext);
}

/**
 * ScrollView dùng bên trong `Modal`: khi đang ở đầu nội dung thì nhường cử chỉ
 * kéo xuống cho sheet (để đóng), khi đã cuộn xuống thì cuộn như thường.
 */
export function SheetScrollView({ onScroll, ...rest }: ScrollViewProps) {
  const drag = useSheetDrag();
  return (
    <ScrollView
      bounces={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        drag?.setBodyDragEnabled(e.nativeEvent.contentOffset.y <= 0);
        onScroll?.(e);
      }}
      {...rest}
    />
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Cho vuốt-đóng ở cả phần thân sheet (mặc định). Đặt false với form đang có
   * dữ liệu nháp — khi đó chỉ vuốt ở thanh grabber mới đóng.
   */
  bodyDrag?: boolean;
  children: ReactNode;
}

/** Bottom-sheet modal: vuốt xuống hoặc bấm ra ngoài để đóng. */
export function Modal({
  open,
  onClose,
  title,
  bodyDrag = true,
  children,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const bodyDragEnabled = useRef(bodyDrag);

  // Mỗi lần mở lại: về vị trí gốc và cho phép kéo ở thân sheet.
  useEffect(() => {
    if (!open) return;
    translateY.setValue(0);
    bodyDragEnabled.current = bodyDrag;
  }, [open, bodyDrag, translateY]);

  const dragApi = useMemo<SheetDragApi>(
    () => ({
      setBodyDragEnabled: (enabled) => {
        bodyDragEnabled.current = enabled;
      },
    }),
    []
  );

  const closeWithAnimation = useCallback(() => {
    Animated.timing(translateY, {
      toValue: EXIT_OFFSET,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [onClose, translateY]);

  const springBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const handlers = useMemo(
    () => ({
      onPanResponderMove: (_: unknown, g: PanResponderGestureState) => {
        translateY.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_: unknown, g: PanResponderGestureState) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) closeWithAnimation();
        else springBack();
      },
      onPanResponderTerminate: springBack,
    }),
    [closeWithAnimation, springBack, translateY]
  );

  // Grabber ở đầu sheet: chạm là kéo được ngay.
  const grabberPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        ...handlers,
      }),
    [handlers]
  );

  // Thân sheet: chỉ chiếm cử chỉ khi kéo xuống rõ ràng, và chỉ khi nội dung
  // không cần cử chỉ đó (đang ở đầu danh sách / không tự cuộn).
  const bodyPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) =>
          bodyDrag &&
          bodyDragEnabled.current &&
          g.dy > 10 &&
          Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        ...handlers,
      }),
    [bodyDrag, handlers]
  );

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 260],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <RNModal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            style={styles.flexFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          accessibilityViewIsModal
        >
          <View {...grabberPan.panHandlers} style={styles.grabberZone}>
            <View style={styles.grabber} />
            {!!title && <Text style={styles.title}>{title}</Text>}
          </View>

          <View {...bodyPan.panHandlers} style={styles.body}>
            <SheetDragContext.Provider value={dragApi}>
              {children}
            </SheetDragContext.Provider>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  flexFill: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl + spacing.lg,
  },
  // Vùng chạm để kéo — cố ý cao thoáng cho dễ trúng ngón tay.
  grabberZone: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  title: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  body: { gap: spacing.md },
});
