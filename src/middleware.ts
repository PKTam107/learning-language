import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp, createNonce } from "@/lib/csp";

export async function middleware(request: NextRequest) {
  // Nonce sinh mới mỗi request — nếu dùng lại thì kẻ tấn công đoán được và CSP
  // mất tác dụng.
  const nonce = createNonce();
  return await updateSession(request, { nonce, csp: buildCsp(nonce) });
}

export const config = {
  matcher: [
    // Áp dụng cho mọi route trừ static assets & image optimizer
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
