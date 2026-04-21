"use client";

// ============================================================
// TopNavBar — Thanh điều hướng trên cùng (Responsive)
// Desktop: Full tabs hiển thị ngang
// Mobile: Scroll ngang + Logo thu gọn
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { subscribeUserToPush, unsubscribeUserFromPush } from "@/utils/pushSubscription";

export type NavTab = "tin-nhan" | "dang-ky" | "chinh-sach" | "khoa-hoc";

const NAV_TABS: { key: NavTab; label: string }[] = [
  { key: "tin-nhan", label: "Tin Nhắn" },
  { key: "dang-ky", label: "Đăng ký" },
  { key: "chinh-sach", label: "Chính sách" },
  { key: "khoa-hoc", label: "Danh sách khóa học" },
];

export function TopNavBar({
  activeTab,
  onTabChange,
  onOpenSearch,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSearch: () => void;
}) {
  const router = useRouter();

  // 🔔 Notification state
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setNotifSupported(true);
      const perm = Notification.permission;
      const userPref = localStorage.getItem("kn_notif") !== "off";
      setNotifEnabled(perm === "granted" && userPref);
    }
  }, []);

  const toggleNotification = useCallback(async () => {
    if (!notifSupported || notifLoading) return;

    if (notifEnabled) {
      // ── TẮT — phản hồi ngay lập tức ──
      setNotifEnabled(false);
      localStorage.setItem("kn_notif", "off");
      // Hủy push subscription ở background
      unsubscribeUserFromPush().catch(() => { });
    } else {
      // ── BẬT — xin quyền trước, hiện loading ──
      setNotifLoading(true);

      try {
        // Bước 1: Xin quyền notification (bắt buộc phải từ click)
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotifLoading(false);
          return;
        }

        // Bước 2: Toggle UI ngay khi được grant
        setNotifEnabled(true);
        localStorage.setItem("kn_notif", "on");

        // Bước 3: Đăng ký push subscription ở background
        subscribeUserToPush().catch((err) => {
          console.warn("[Push] Background subscription failed:", err);
        });
      } catch (err) {
        console.error("[Notification] Toggle error:", err);
      } finally {
        setNotifLoading(false);
      }
    }
  }, [notifEnabled, notifSupported, notifLoading]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-[#2563EB] h-11 flex items-center px-3 md:px-4 shrink-0 select-none">
      {/* Logo — Khai Nguyên Hoa Ngữ */}
      <div className="flex items-center gap-2 mr-4 md:mr-8 shrink-0">
        <img
          src="/logo.png"
          alt="Khai Nguyen Logo"
          width={28}
          height={28}
          className="rounded-md"
        />
        <span className="text-white font-semibold text-sm tracking-wide hidden md:block">
          Khai Nguyên Hoa Ngữ
        </span>
      </div>

      {/* Tabs — scroll ngang trên mobile */}
      <nav className="flex items-center gap-0.5 h-full overflow-x-auto scrollbar-hide flex-1 min-w-0">
        {NAV_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                relative px-3 md:px-4 h-full flex items-center text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0
                ${isActive
                  ? "text-white"
                  : "text-white/60 hover:text-white/80"
                }
              `}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-white rounded-t-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right side — search + logout */}
      <div className="ml-auto flex items-center gap-1.5 md:gap-2 shrink-0">
        <button
          id="btn-open-tim-zalo"
          onClick={onOpenSearch}
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          title="Tìm khách hàng mới qua Zalo"
        >
          <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </button>

        {/* 🔔 Notification Bell Toggle */}
        {notifSupported && (
          <button
            id="btn-toggle-notification"
            onClick={toggleNotification}
            disabled={notifLoading}
            className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${notifLoading
                ? "bg-white/30 cursor-wait"
                : notifEnabled
                  ? "bg-white/25 hover:bg-white/35"
                  : "bg-white/15 hover:bg-white/25"
              }`}
            title={notifLoading ? "Đang xử lý..." : notifEnabled ? "Tắt thông báo" : "Bật thông báo"}
          >
            {/* Bell icon */}
            <svg className={`w-4 h-4 transition-opacity ${notifLoading ? "opacity-40" : "text-white/90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Badge: spinner / checkmark / slash */}
            {notifLoading ? (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
            ) : notifEnabled ? (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-[1.5px] border-[#2563EB] flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="block w-[1.5px] h-5 bg-white/70 rotate-45 rounded-full" />
              </span>
            )}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-red-500/80 flex items-center justify-center transition-colors group"
          title="Đăng xuất"
        >
          <svg className="w-4 h-4 text-white/80 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
