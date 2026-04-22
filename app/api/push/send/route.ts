// ============================================================
// /api/push/send — Gửi Push Notification đến tất cả thiết bị
// Gọi từ n8n khi có tin nhắn mới
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// ── Supabase (server-side, dùng service key cũng được, ở đây dùng anon) ──
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── VAPID config ──
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
    "mailto:admin@khainguyenhoangu.com",
    VAPID_PUBLIC,
    VAPID_PRIVATE
);

/**
 * POST /api/push/send
 *
 * Body JSON:
 * {
 *   "title": "Nguyễn Văn A",         // Tên người gửi
 *   "body": "Xin chào!",             // Nội dung tin nhắn
 *   "url": "/"                        // (optional) URL khi click notification
 * }
 *
 * → Gửi Web Push đến TẤT CẢ thiết bị trong bảng push_subscriptions
 * → Tự xóa subscription nếu endpoint đã hết hạn (410 Gone)
 */
export async function POST(request: NextRequest) {
    try {
        const { title, body, url } = await request.json();

        if (!title && !body) {
            return NextResponse.json(
                { error: "Thiếu title hoặc body" },
                { status: 400 }
            );
        }

        // Lấy tất cả subscriptions từ Supabase
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: subs, error: fetchErr } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth");

        if (fetchErr || !subs || subs.length === 0) {
            return NextResponse.json(
                { ok: true, sent: 0, message: "Không có thiết bị nào đăng ký" }
            );
        }

        // Payload gửi đến Service Worker
        const payload = JSON.stringify({
            title: title || "Khai Nguyên Omni",
            body: body || "Bạn có tin nhắn mới!",
            url: url || "/",
        });

        // Gửi push đến từng thiết bị
        const results = await Promise.allSettled(
            subs.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                };

                try {
                    await webpush.sendNotification(pushSubscription, payload);
                    return { endpoint: sub.endpoint, status: "ok" };
                } catch (err: unknown) {
                    const statusCode = (err as { statusCode?: number })?.statusCode;

                    // 410 Gone hoặc 404 = subscription hết hạn → xóa khỏi DB
                    if (statusCode === 410 || statusCode === 404) {
                        await supabase
                            .from("push_subscriptions")
                            .delete()
                            .eq("endpoint", sub.endpoint);
                        return { endpoint: sub.endpoint, status: "expired_deleted" };
                    }

                    console.error(`[Push] Lỗi gửi đến ${sub.endpoint}:`, err);
                    return { endpoint: sub.endpoint, status: "error", statusCode };
                }
            })
        );

        const sent = results.filter(
            (r) => r.status === "fulfilled" && (r.value as { status: string }).status === "ok"
        ).length;

        return NextResponse.json({ ok: true, sent, total: subs.length });
    } catch (err) {
        console.error("[Push] Lỗi API:", err);
        return NextResponse.json(
            { error: "Lỗi server khi gửi push" },
            { status: 500 }
        );
    }
}
