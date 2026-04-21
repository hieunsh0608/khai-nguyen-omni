// ============================================================
// pushSubscription.ts — Đăng ký Push Notification + Lưu Supabase
// ============================================================

import { supabase } from "@/utils/supabase/client";

/**
 * Chuyển VAPID public key từ base64url → Uint8Array (spec Web Push)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Đăng ký Push Notification:
 * 1. Xin quyền Notification
 * 2. Register Service Worker
 * 3. Subscribe pushManager (VAPID)
 * 4. Upsert subscription vào Supabase
 *
 * @returns true nếu đăng ký thành công
 */
export async function subscribeUserToPush(): Promise<boolean> {
    // Guard: trình duyệt phải hỗ trợ
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("[Push] Trình duyệt không hỗ trợ Push Notification.");
        return false;
    }

    // Guard: permission đã được TopNavBar xin trước khi gọi hàm này
    if (Notification.permission !== "granted") {
        console.warn("[Push] Permission chưa được cấp.");
        return false;
    }

    try {
        // 2) Register Service Worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // 3) Subscribe pushManager
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            console.error("[Push] Thiếu NEXT_PUBLIC_VAPID_PUBLIC_KEY trong .env.local");
            return false;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });

        const subJson = subscription.toJSON();

        // 4) Upsert vào bảng push_subscriptions
        const { error } = await supabase.from("push_subscriptions").upsert(
            {
                endpoint: subJson.endpoint,
                keys: subJson.keys,
                // user_id sẽ được set nếu có auth, hiện tại bỏ trống
            },
            { onConflict: "endpoint" }
        );

        if (error) {
            console.error("[Push] Lỗi lưu subscription vào Supabase:", error);
            return false;
        }

        // Lưu trạng thái vào localStorage
        localStorage.setItem("kn_notif", "on");
        console.log("[Push] Đăng ký thành công!");
        return true;
    } catch (err) {
        console.error("[Push] Lỗi đăng ký push:", err);
        return false;
    }
}

/**
 * Hủy đăng ký Push Notification:
 * - Unsubscribe khỏi pushManager
 * - Xóa record trên Supabase
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
    if (!("serviceWorker" in navigator)) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;

            // Unsubscribe trên browser
            await subscription.unsubscribe();

            // Xóa record trên Supabase
            await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", endpoint);
        }

        localStorage.setItem("kn_notif", "off");
        console.log("[Push] Đã hủy đăng ký thông báo.");
        return true;
    } catch (err) {
        console.error("[Push] Lỗi hủy đăng ký:", err);
        return false;
    }
}
