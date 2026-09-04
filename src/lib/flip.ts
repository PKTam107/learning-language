/**
 * Cử chỉ lật thẻ — hàm thuần, không đụng DOM/React Native.
 *
 * Vì sao tách ra: cùng một cảm giác lật phải giống nhau trên web (Pointer Events)
 * và mobile (PanResponder), nhưng hai nền tảng không dùng chung được mã giao diện.
 * Phần quyết định "xoay bao nhiêu độ / thả tay ra có lật không" nằm ở đây, có test,
 * và được nhân bản sang `mobile/src/lib/flip.ts` (tests/parity.test.ts canh).
 *
 * Mọi hàm ở đây mở đầu bằng `"worklet"`: bản mobile chạy cử chỉ trên **UI thread**
 * (react-native-reanimated), mà worklet chỉ gọi được hàm đã đánh dấu. Trên web đó
 * chỉ là một câu lệnh chuỗi vô hại — đổi lại hai nền tảng dùng CHUNG một bản logic
 * thay vì mobile phải chép tay lại phép tính vào trong worklet.
 *
 * Quy ước góc: **cộng dồn**, không tua ngược. Lật xuôi là 0 → 180 → 360 → …, lật
 * ngược là 0 → −180 → −360 → … Mặt đang hiện chỉ phụ thuộc góc chẵn hay lẻ nửa
 * vòng, nên thẻ luôn quay tiếp theo hướng người dùng vừa vuốt thay vì rewind.
 */

/** Kéo/vuốt được bao nhiêu phần bề ngang thẻ thì thả tay ra là lật hẳn. */
export const COMMIT_RATIO = 0.3;
/** Vuốt nhanh hơn mức này (px/ms) thì lật luôn, không cần kéo đủ xa. */
export const COMMIT_VELOCITY = 0.45;
/** Ngưỡng tách "kéo ngang" khỏi "chạm" và khỏi "cuộn dọc" (px). */
export const DRAG_SLOP = 8;

/** Góc này đang cho thấy mặt sau? (mọi bội số lẻ của nửa vòng) */
export function isBack(deg: number): boolean {
  "worklet";
  return Math.abs(Math.round(deg / 180)) % 2 === 1;
}

/** Chốt góc về mặt gần nhất — dùng khi thả tay mà không lật. */
export function snapToFace(deg: number): number {
  "worklet";
  return Math.round(deg / 180) * 180;
}

/** Góc sau khi lật thêm một mặt theo hướng `dir` (1 = sang phải). */
export function nextAngle(deg: number, dir: 1 | -1): number {
  "worklet";
  return snapToFace(deg) + 180 * dir;
}

/**
 * Cử chỉ này là "kéo ngang để lật" hay là thao tác khác?
 * Nghiêng về chiều dọc thì nhường cho việc cuộn trang / cuộn mặt sau.
 */
export function isHorizontalDrag(dx: number, dy: number): boolean {
  "worklet";
  return Math.abs(dx) > DRAG_SLOP && Math.abs(dx) > Math.abs(dy);
}

/**
 * Góc trong lúc ngón tay/con trỏ còn đang giữ: bám 1–1 theo quãng kéo, kéo trọn
 * bề ngang thẻ = nửa vòng. Chặn ở ±180° quanh góc xuất phát để kéo mạnh tay cũng
 * chỉ sang đúng mặt kia chứ không quay tít.
 */
export function dragAngle(base: number, dx: number, width: number): number {
  "worklet";
  const raw = base + (dx / Math.max(1, width)) * 180;
  return Math.max(base - 180, Math.min(base + 180, raw));
}

export interface DragEnd {
  /** Góc lúc bắt đầu chạm. */
  base: number;
  /** Tổng quãng kéo ngang (px). */
  dx: number;
  /** Vận tốc ngang lúc thả (px/ms). */
  velocity: number;
  /** Bề ngang thẻ (px). */
  width: number;
  /** Cử chỉ bị hủy (mất con trỏ, cuộc gọi đến…) → coi như không lật. */
  cancelled?: boolean;
}

export interface DragResult {
  /** Góc đích để chạy animation về. */
  deg: number;
  /** Có lật sang mặt kia không (cha cần đổi trạng thái `flipped`). */
  flipped: boolean;
  /** Hướng vừa lật — lần lật bằng chạm/phím sau đó đi theo hướng này. */
  dir: 1 | -1;
}

/**
 * Thả tay ra thì lật hẳn hay bật về chỗ cũ.
 *
 * Hai điều kiện độc lập: kéo **đủ xa** (theo tỉ lệ bề ngang, nên thẻ to hay nhỏ
 * đều cần cùng một tỉ lệ quãng tay), hoặc vuốt **đủ nhanh** — vuốt nhẹ mà dứt
 * khoát vẫn lật được, không bắt kéo lê qua giữa thẻ.
 */
export function settleDrag({
  base,
  dx,
  velocity,
  width,
  cancelled = false,
}: DragEnd): DragResult {
  "worklet";
  const fast = Math.abs(velocity) > COMMIT_VELOCITY;
  const far = Math.abs(dx / Math.max(1, width)) > COMMIT_RATIO;
  // Vuốt nhanh ngược lại đoạn vừa kéo thì tin vào vận tốc: người dùng đổi ý
  // giữa chừng và cú hất cuối mới là ý định thật.
  const dir: 1 | -1 = Math.sign(fast ? velocity : dx) < 0 ? -1 : 1;

  if (cancelled || (!fast && !far)) {
    return { deg: snapToFace(base), flipped: false, dir };
  }
  return { deg: nextAngle(base, dir), flipped: true, dir };
}

/** Đưa `deg` về vòng gần `near` nhất — dùng khi đọc góc thật từ ma trận CSS. */
export function nearestTurn(deg: number, near: number): number {
  "worklet";
  return near + ((((deg - near + 180) % 360) + 360) % 360) - 180;
}
