/**
 * Dev diagnostics: proves the request reached the Next server (before route module compile/run).
 * If a client times out but no log line appears, the failure is before this layer (network / wrong host).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[api.timing] middleware", "route_enter", {
      method: request.method,
      path: request.nextUrl.pathname,
      hasAuth: Boolean(request.headers.get("authorization")),
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
