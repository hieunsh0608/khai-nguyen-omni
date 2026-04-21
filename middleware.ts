import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Middleware — Bảo vệ Dashboard
// Chặn truy cập / nếu chưa có cookie kn_session
// Cho phép: /login, /dang-ky, /api/*, /_next/*, static files
// ============================================================

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Các route KHÔNG cần đăng nhập
  const publicPaths = [
    "/login",
    "/dang-ky",
    "/api/",
    "/_next/",
    "/favicon.ico",
  ];

  // Cho qua nếu là public path
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Cho qua static files (ảnh, font, css...)
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|css|js|map)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Dev mode: bỏ qua check cookie (iframe preview chặn cookie)
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Production: kiểm tra cookie đăng nhập
  const session = req.cookies.get("kn_session")?.value;

  if (!session) {
    // Chưa đăng nhập → đá về /login
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Đã đăng nhập → cho vào
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
