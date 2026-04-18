"use client";

// ============================================================
// TopNavBar — Thanh điều hướng trên cùng (Responsive)
// Desktop: Full tabs hiển thị ngang
// Mobile: Scroll ngang + Logo thu gọn
// ============================================================

import { useRouter } from "next/navigation";

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
