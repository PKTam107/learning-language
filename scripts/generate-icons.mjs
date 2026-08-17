/**
 * Sinh bộ icon PNG cho PWA / apple-touch-icon vào `public/`.
 *
 *   node scripts/generate-icons.mjs
 *
 * Vẽ thẳng ra mảng pixel rồi tự đóng gói PNG bằng `zlib` của Node — không cần
 * cài thêm gì (máy build không chắc có sharp/ImageMagick). Chạy lại khi đổi
 * nhận diện; ảnh sinh ra được commit vào repo nên build thường không cần chạy.
 *
 * Hình: nền gradient brand (indigo) + hai tấm thẻ trắng chồng chéo — đúng ẩn dụ
 * flashcard của sản phẩm.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
/** Next tự phát thẻ <link rel="apple-touch-icon"> cho file theo quy ước app/apple-icon.png. */
const APP_DIR = join(ROOT, "src", "app");

/** Số mẫu mỗi chiều khi vẽ (khử răng cưa bằng cách vẽ to rồi thu nhỏ). */
const SS = 4;

const BRAND_TOP = [99, 102, 241]; // indigo-500
const BRAND_BOTTOM = [67, 56, 202]; // indigo-700
const BRAND_INK = [79, 70, 229]; // indigo-600
const WHITE = [255, 255, 255];

// ---------------------------------------------------------------- vẽ ------

/** Ảnh RGBA phẳng, mỗi kênh 1 byte. */
function createCanvas(size) {
  return { size, data: new Uint8ClampedArray(size * size * 4) };
}

function blend(canvas, x, y, [r, g, b], alpha) {
  if (alpha <= 0) return;
  const i = (y * canvas.size + x) * 4;
  const d = canvas.data;
  const a = Math.min(1, alpha);
  d[i] = d[i] * (1 - a) + r * a;
  d[i + 1] = d[i + 1] * (1 - a) + g * a;
  d[i + 2] = d[i + 2] * (1 - a) + b * a;
  d[i + 3] = d[i + 3] * (1 - a) + 255 * a;
}

/** Điểm (px,py) có nằm trong hình chữ nhật bo góc (tâm gốc, chưa xoay) không? */
function insideRoundRect(px, py, w, h, r) {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const ax = Math.abs(px) - hw;
  const ay = Math.abs(py) - hh;
  if (ax <= 0 || ay <= 0) return Math.abs(px) <= w / 2 && Math.abs(py) <= h / 2;
  return ax * ax + ay * ay <= r * r;
}

/**
 * Tô một hình chữ nhật bo góc, có thể xoay.
 * `color` là mảng RGB hoặc hàm (ty: 0..1 theo chiều dọc ảnh) → RGB (để đổ gradient).
 */
function fillRoundRect(canvas, { cx, cy, w, h, r, angle = 0, color, alpha = 1 }) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  // Bao ngoài đủ rộng để chứa hình sau khi xoay.
  const reach = Math.ceil(Math.hypot(w, h) / 2) + 2;
  const x0 = Math.max(0, Math.floor(cx - reach));
  const x1 = Math.min(canvas.size - 1, Math.ceil(cx + reach));
  const y0 = Math.max(0, Math.floor(cy - reach));
  const y1 = Math.min(canvas.size - 1, Math.ceil(cy + reach));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      // Quay ngược điểm về hệ tọa độ riêng của hình.
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (!insideRoundRect(lx, ly, w, h, r)) continue;
      const rgb = typeof color === "function" ? color(y / canvas.size) : color;
      blend(canvas, x, y, rgb, alpha);
    }
  }
}

function gradient(top, bottom) {
  return (t) => [
    top[0] + (bottom[0] - top[0]) * t,
    top[1] + (bottom[1] - top[1]) * t,
    top[2] + (bottom[2] - top[2]) * t,
  ];
}

/** Thu ảnh siêu mẫu về kích thước thật (trung bình mỗi khối SS×SS). */
function downsample(canvas, factor) {
  const size = canvas.size / factor;
  const out = createCanvas(size);
  const n = factor * factor;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * canvas.size + (x * factor + sx)) * 4;
          r += canvas.data[i];
          g += canvas.data[i + 1];
          b += canvas.data[i + 2];
          a += canvas.data[i + 3];
        }
      }
      const o = (y * size + x) * 4;
      out.data[o] = r / n;
      out.data[o + 1] = g / n;
      out.data[o + 2] = b / n;
      out.data[o + 3] = a / n;
    }
  }
  return out;
}

/**
 * Vẽ icon ở kích thước `size`.
 * @param bleed  true = nền tràn viền (icon maskable / apple-touch-icon, hệ điều
 *               hành tự bo góc); false = tự bo góc kiểu squircle.
 * @param scale  tỉ lệ phần hình so với khung — icon maskable cần chừa vùng an toàn.
 */
function drawIcon(size, { bleed = false, scale = 1 } = {}) {
  const S = size * SS;
  const canvas = createCanvas(S);
  const u = S; // đơn vị quy chiếu: mọi số đo dưới đây là phần trăm cạnh

  // Nền
  fillRoundRect(canvas, {
    cx: S / 2,
    cy: S / 2,
    w: S,
    h: S,
    r: bleed ? 0 : 0.2235 * u,
    color: gradient(BRAND_TOP, BRAND_BOTTOM),
  });

  const k = scale;
  const cx = S / 2;
  const cy = S / 2;

  // Thẻ sau — mờ, nghiêng ngược chiều để lộ ra như một xấp thẻ.
  fillRoundRect(canvas, {
    cx: cx - 0.06 * u * k,
    cy: cy - 0.02 * u * k,
    w: 0.42 * u * k,
    h: 0.54 * u * k,
    r: 0.06 * u * k,
    angle: -13,
    color: WHITE,
    alpha: 0.42,
  });

  // Thẻ trước
  const frontAngle = 7;
  const frontCx = cx + 0.05 * u * k;
  const frontCy = cy + 0.03 * u * k;
  fillRoundRect(canvas, {
    cx: frontCx,
    cy: frontCy,
    w: 0.44 * u * k,
    h: 0.56 * u * k,
    r: 0.07 * u * k,
    angle: frontAngle,
    color: WHITE,
  });

  // Hai vạch chữ trên thẻ trước — đặt theo hệ tọa độ đã xoay của thẻ.
  const rad = (frontAngle * Math.PI) / 180;
  const place = (dx, dy) => ({
    cx: frontCx + dx * Math.cos(rad) - dy * Math.sin(rad),
    cy: frontCy + dx * Math.sin(rad) + dy * Math.cos(rad),
  });
  for (const [dx, dy, w] of [
    [0, -0.07 * u * k, 0.24 * u * k],
    [-0.045 * u * k, 0.03 * u * k, 0.15 * u * k],
  ]) {
    fillRoundRect(canvas, {
      ...place(dx, dy),
      w,
      h: 0.042 * u * k,
      r: 0.021 * u * k,
      angle: frontAngle,
      color: BRAND_INK,
    });
  }

  return downsample(canvas, SS);
}

// ---------------------------------------------------------- đóng gói PNG --

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(canvas) {
  const { size, data } = canvas;
  // Mỗi hàng pixel phải có 1 byte filter đứng trước (dùng filter 0 = none).
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let i = 0; i < size * 4; i++) {
      raw[rowStart + 1 + i] = data[y * size * 4 + i];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter mặc định
  ihdr[12] = 0; // không interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ chạy --

mkdirSync(PUBLIC_DIR, { recursive: true });

const TARGETS = [
  // Manifest PWA trỏ tới ba file này (xem src/app/manifest.ts).
  [PUBLIC_DIR, "public", "icon-192.png", 192, {}],
  [PUBLIC_DIR, "public", "icon-512.png", 512, {}],
  // Android cắt icon maskable theo nhiều hình dạng — hình chính phải nằm gọn
  // trong ~80% khung, nếu không sẽ bị xén mất góc.
  [PUBLIC_DIR, "public", "icon-maskable-512.png", 512, { bleed: true, scale: 0.72 }],
  // iOS tự bo góc icon này, nên vẽ tràn viền.
  [APP_DIR, "src/app", "apple-icon.png", 180, { bleed: true, scale: 0.92 }],
];

for (const [dir, label, name, size, opts] of TARGETS) {
  const png = encodePNG(drawIcon(size, opts));
  writeFileSync(join(dir, name), png);
  console.log(`✓ ${label}/${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
