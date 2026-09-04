import { describe, expect, it } from "vitest";
import {
  COMMIT_RATIO,
  COMMIT_VELOCITY,
  DRAG_SLOP,
  dragAngle,
  isBack,
  isHorizontalDrag,
  nearestTurn,
  nextAngle,
  settleDrag,
  snapToFace,
} from "@/lib/flip";

/** Bề ngang thẻ giả định cho mọi phép thử (px). */
const W = 300;

describe("isBack — mặt nào đang hiện", () => {
  it("góc chẵn nửa vòng là mặt trước, lẻ là mặt sau", () => {
    expect(isBack(0)).toBe(false);
    expect(isBack(180)).toBe(true);
    expect(isBack(360)).toBe(false);
    expect(isBack(540)).toBe(true);
  });

  it("lật ngược chiều cũng cho cùng kết quả", () => {
    expect(isBack(-180)).toBe(true);
    expect(isBack(-360)).toBe(false);
  });

  it("chưa qua nửa đường thì vẫn là mặt đang đứng", () => {
    expect(isBack(80)).toBe(false);
    expect(isBack(100)).toBe(true);
  });
});

describe("dragAngle — góc bám theo tay", () => {
  it("kéo trọn bề ngang thẻ = nửa vòng", () => {
    expect(dragAngle(0, W, W)).toBe(180);
    expect(dragAngle(0, -W, W)).toBe(-180);
  });

  it("bám tỉ lệ với quãng kéo", () => {
    expect(dragAngle(0, W / 2, W)).toBe(90);
    expect(dragAngle(180, W / 3, W)).toBeCloseTo(240, 5);
  });

  it("kéo quá tay vẫn chỉ tới đúng mặt kia, không quay tít", () => {
    expect(dragAngle(0, W * 5, W)).toBe(180);
    expect(dragAngle(360, -W * 5, W)).toBe(180);
  });

  it("bề ngang 0 (chưa đo layout xong) không sinh NaN/Infinity", () => {
    expect(Number.isFinite(dragAngle(0, 50, 0))).toBe(true);
  });
});

describe("settleDrag — thả tay ra thì lật hay bật về", () => {
  const slow = 0;

  it("kéo quá ngưỡng tỉ lệ thì lật", () => {
    const r = settleDrag({ base: 0, dx: W * (COMMIT_RATIO + 0.05), velocity: slow, width: W });
    expect(r).toEqual({ deg: 180, flipped: true, dir: 1 });
  });

  it("kéo chưa tới ngưỡng thì bật về mặt cũ", () => {
    const r = settleDrag({ base: 0, dx: W * (COMMIT_RATIO - 0.05), velocity: slow, width: W });
    expect(r.flipped).toBe(false);
    expect(r.deg).toBe(0);
  });

  it("vuốt nhanh thì lật dù quãng tay ngắn", () => {
    const r = settleDrag({ base: 0, dx: 20, velocity: COMMIT_VELOCITY + 0.2, width: W });
    expect(r.flipped).toBe(true);
    expect(r.deg).toBe(180);
  });

  it("kéo sang trái thì lật sang trái — không phải lúc nào cũng một chiều", () => {
    const r = settleDrag({ base: 0, dx: -W * 0.6, velocity: slow, width: W });
    expect(r).toEqual({ deg: -180, flipped: true, dir: -1 });
  });

  it("lật tiếp từ mặt sau thì cộng dồn, không tua ngược", () => {
    const r = settleDrag({ base: 180, dx: W * 0.6, velocity: slow, width: W });
    expect(r.deg).toBe(360);
    expect(isBack(r.deg)).toBe(false);
  });

  it("đổi ý giữa chừng: hất ngược lại thì theo vận tốc, không theo quãng đã kéo", () => {
    const r = settleDrag({
      base: 0,
      dx: W * 0.5, // đã kéo sang phải khá xa
      velocity: -(COMMIT_VELOCITY + 0.3), // nhưng cú hất cuối là sang trái
      width: W,
    });
    expect(r.dir).toBe(-1);
    expect(r.deg).toBe(-180);
  });

  it("cử chỉ bị hủy thì luôn về mặt gần nhất", () => {
    const r = settleDrag({ base: 0, dx: W, velocity: 2, width: W, cancelled: true });
    expect(r).toMatchObject({ deg: 0, flipped: false });
  });

  it("bật về thì chốt đúng mặt, không để thẻ nằm nghiêng", () => {
    const r = settleDrag({ base: 179.4, dx: 3, velocity: 0, width: W });
    expect(r.deg).toBe(180);
  });
});

describe("isHorizontalDrag — nhường chỗ cho chạm và cuộn dọc", () => {
  it("rung tay vài pixel không tính là kéo", () => {
    expect(isHorizontalDrag(DRAG_SLOP - 1, 0)).toBe(false);
  });

  it("nghiêng về chiều dọc thì nhường cho cuộn", () => {
    expect(isHorizontalDrag(20, 40)).toBe(false);
  });

  it("kéo ngang dứt khoát thì nhận", () => {
    expect(isHorizontalDrag(40, 10)).toBe(true);
    expect(isHorizontalDrag(-40, 10)).toBe(true);
  });
});

describe("nextAngle / snapToFace", () => {
  it("lật thêm một mặt theo hướng đã chọn", () => {
    expect(nextAngle(0, 1)).toBe(180);
    expect(nextAngle(0, -1)).toBe(-180);
    expect(nextAngle(180, 1)).toBe(360);
  });

  it("chốt góc dở dang về mặt gần nhất trước khi lật tiếp", () => {
    expect(snapToFace(172)).toBe(180);
    expect(nextAngle(172, 1)).toBe(360);
  });
});

describe("nearestTurn — nối lại góc đọc từ ma trận CSS", () => {
  it("ma trận chỉ cho biết góc trong (−180, 180]; chọn vòng gần nhất", () => {
    // Đang trên đường 0 → 360, ma trận báo −90 nghĩa là 270.
    expect(nearestTurn(-90, 360)).toBe(270);
    // Đang quanh 0 thì −90 vẫn là −90.
    expect(nearestTurn(-90, 0)).toBe(-90);
  });

  it("giữ nguyên góc đã đúng vòng", () => {
    expect(nearestTurn(90, 90)).toBe(90);
  });
});
