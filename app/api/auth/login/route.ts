import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// POST /api/auth/login
// Body: { username, password }
// Query bảng staff_logins → set HttpOnly cookie nếu đúng
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Thiếu tên đăng nhập hoặc mật khẩu" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("staff_logins")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Tài khoản hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    // Đăng nhập thành công → set cookie
    const sessionValue = Buffer.from(
      JSON.stringify({ user: data.username, ts: Date.now() })
    ).toString("base64");

    const res = NextResponse.json({ ok: true, user: data.username });

    res.cookies.set("kn_session", sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Lỗi server" },
      { status: 500 }
    );
  }
}
