// ============================================================
// Service Worker — Push Notification + Offline Cache
// Khai Nguyên Omni PWA
// ============================================================

// ── Install — Skip waiting để kích hoạt ngay ──────────────────

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

// ── Push Notification ──────────────────────────────────────────

self.addEventListener("push", (event) => {
    let data = { title: "Khai Nguyên Omni", body: "Bạn có tin nhắn mới!" };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch {
        // Nếu parse lỗi thì dùng default
    }

    const options = {
        body: data.body || "Bạn có tin nhắn mới!",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: {
            url: data.url || "/",
        },
        tag: "kn-message", // Gộp notification cùng tag
        renotify: true,
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title || "Khai Nguyên Omni", options),
            // Báo cho tất cả tab đang mở: có tin nhắn mới → fetch ngay
            clients.matchAll({ type: "window", includeUncontrolled: true }).then((cls) => {
                cls.forEach((client) => client.postMessage({ type: "NEW_MESSAGE" }));
            }),
        ])
    );
});

// ── Notification Click — Focus hoặc mở tab ─────────────────

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // Nếu đã có tab mở → focus
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    return client.focus();
                }
            }
            // Chưa có tab → mở mới
            return clients.openWindow(targetUrl);
        })
    );
});

// ── Activate — Claim clients ngay ───────────────────────────

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});
