import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/** Một hạn mức: tối đa `limit` lượt trong cửa sổ `windowSeconds` giây. */
export interface RateRule {
  /** Tên bộ đếm, phân biệt theo route (vd "lookup"). */
  bucket: string;
  limit: number;
  windowSeconds: number;
  /** Đếm riêng cho từng thiết bị thay vì gộp cả tài khoản. */
  perDevice?: boolean;
}

export interface RateLimitInput {
  userId: string;
  /** Header x-device-id (nếu client có gửi). Thiếu → bỏ qua rule perDevice. */
  deviceId?: string | null;
  rules: RateRule[];
  /** Thông báo hiện cho người dùng khi bị chặn. */
  message: string;
}

const MINUTE = 60;
export const DAY = 86400;

/**
 * Ghép khóa bộ đếm. Bộ đếm là (user_id, bucket) trong Postgres nên chỉ cần
 * nhét device vào tên bucket là có hạn mức riêng cho từng máy — không phải
 * đổi schema.
 */
function bucketKey(rule: RateRule, deviceId?: string | null): string | null {
  if (!rule.perDevice) return rule.bucket;
  if (!deviceId) return null; // client chưa gửi device id → chỉ còn hạn mức tài khoản
  return `${rule.bucket}:d:${deviceId}`;
}

/**
 * Tiêu một lượt trên mọi hạn mức. Trả về rule đầu tiên bị vượt, hoặc null nếu
 * còn trong hạn.
 *
 * Chạy song song (một vòng round-trip) và cố ý vẫn tiêu cả các bộ đếm khác khi
 * một cái đã vượt — cửa sổ cố định sẽ tự reset nên vài lượt đếm dôi là vô hại,
 * đổi lại không phải chờ tuần tự.
 *
 * Fail-open: thiếu service key hoặc RPC lỗi (vd migration chưa chạy) → cho qua.
 * Chặn oan người dùng thật tệ hơn là để lọt vài request.
 */
async function consume(input: RateLimitInput): Promise<RateRule | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = createServiceClient();
  const checks = input.rules.map(async (rule) => {
    const bucket = bucketKey(rule, input.deviceId);
    if (!bucket) return null;
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_user_id: input.userId,
      p_bucket: bucket,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.warn("rate limit rpc:", error.message);
      return null;
    }
    return data === false ? rule : null;
  });

  try {
    const results = await Promise.all(checks);
    return results.find((r): r is RateRule => r !== null) ?? null;
  } catch (e) {
    console.warn("rate limit:", (e as Error).message);
    return null;
  }
}

/**
 * Kiểm tra hạn mức cho một request đã xác thực.
 * Trả về `null` nếu được phép, hoặc sẵn một response 429 nếu đã vượt.
 */
export async function enforceRateLimit(
  input: RateLimitInput
): Promise<NextResponse | null> {
  const exceeded = await consume(input);
  if (!exceeded) return null;

  const retryAfter =
    exceeded.windowSeconds >= DAY
      ? // Cửa sổ ngày: không biết chính xác còn bao lâu (mốc bắt đầu nằm trong
        // DB), gợi ý thử lại sau 1 giờ thay vì bắt chờ trọn 24 tiếng.
        3600
      : exceeded.windowSeconds;

  return NextResponse.json(
    {
      error: "Rate limited",
      message:
        exceeded.windowSeconds >= DAY
          ? `${input.message} Bạn đã dùng hết hạn mức trong ngày (${exceeded.limit} lượt).`
          : input.message,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Hạn mức mặc định cho một route gọi dịch vụ ngoài: phút (tài khoản + máy) + ngày. */
export function standardRules(
  bucket: string,
  perMinute: number,
  perMinutePerDevice: number,
  perDay: number
): RateRule[] {
  return [
    { bucket, limit: perMinute, windowSeconds: MINUTE },
    {
      bucket,
      limit: perMinutePerDevice,
      windowSeconds: MINUTE,
      perDevice: true,
    },
    { bucket: `${bucket}:day`, limit: perDay, windowSeconds: DAY },
  ];
}
