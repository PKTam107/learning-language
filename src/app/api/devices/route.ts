import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/supabase/getUser";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp, describeUserAgent, requestDeviceId } from "@/lib/user-agent";

const PingSchema = z.object({
  deviceId: z.string().min(8).max(64),
  /** Tên máy do client tự đặt (mobile biết tên thật); web để trống → suy từ UA. */
  name: z.string().max(80).optional(),
  platform: z.enum(["web", "ios", "android"]).optional(),
  appVersion: z.string().max(40).optional(),
});

/**
 * POST /api/devices — "máy này vừa hoạt động".
 * Gọi sau khi đăng nhập và mỗi khi mở lại app (client tự giới hạn nhịp).
 * Ghi qua RPC dưới danh tính user nên hàm SQL lấy được cả `session_id` của
 * phiên hiện tại — thứ cần để sau này đăng xuất từ xa đúng thiết bị.
 */
export async function POST(request: Request) {
  const ctx = await getRequestContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = PingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Ping rẻ nhưng vẫn chặn spam: 20 lượt/phút/tài khoản là quá thoải mái cho
  // nhịp thật (mỗi lần mở app một lượt).
  const limited = await enforceRateLimit({
    userId: ctx.user.id,
    deviceId: parsed.data.deviceId,
    rules: [{ bucket: "devices", limit: 20, windowSeconds: 60 }],
    message: "Ghi nhận thiết bị quá dày, thử lại sau ít giây.",
  });
  if (limited) return limited;

  const ua = request.headers.get("user-agent");
  const fromUa = describeUserAgent(ua);

  const { error } = await ctx.supabase.rpc("touch_user_device", {
    p_device_id: parsed.data.deviceId,
    p_name: parsed.data.name ?? fromUa.name,
    p_platform: parsed.data.platform ?? fromUa.platform,
    p_app_version: parsed.data.appVersion ?? null,
    p_user_agent: ua,
    p_ip: clientIp(request),
  });

  if (error) {
    // Migration 0010 chưa chạy → KHÔNG làm hỏng luồng đăng nhập, nhưng phải nói
    // rõ hỏng ở đâu: nuốt lỗi thì bảng cứ rỗng mà không ai biết vì sao.
    console.warn("touch_user_device:", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true });
}

/** GET /api/devices — danh sách thiết bị của chính mình. */
export async function GET(request: Request) {
  const ctx = await getRequestContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await ctx.supabase.rpc("list_user_devices");
  if (error) {
    return NextResponse.json(
      { error: "List failed", message: error.message },
      { status: 502 }
    );
  }
  return NextResponse.json({ devices: data ?? [] });
}

/**
 * DELETE /api/devices?deviceId=... — đăng xuất & gỡ một thiết bị.
 * Phiên hiện tại không bị giết (xem revoke_user_device trong 0010).
 */
export async function DELETE(request: Request) {
  const ctx = await getRequestContext(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceId =
    new URL(request.url).searchParams.get("deviceId") ??
    requestDeviceId(request);
  if (!deviceId) {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase.rpc("revoke_user_device", {
    p_device_id: deviceId,
  });
  if (error) {
    return NextResponse.json(
      { error: "Revoke failed", message: error.message },
      { status: 502 }
    );
  }
  if (data === false) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
