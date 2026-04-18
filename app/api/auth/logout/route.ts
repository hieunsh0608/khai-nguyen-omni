import { NextResponse } from "next/server";

// ============================================================
// POST /api/auth/logout  — Xóa cookie đăng nhập
// ============================================================

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("kn_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Xóa ngay
  });

  return res;
}
