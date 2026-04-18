"use client";

// ============================================================
// MobileInfoDrawer — Panel trượt từ phải vào cho mobile
// Hiển thị Thông tin học viên / Chốt thông tin trên mobile
// ============================================================

import { useEffect } from "react";

interface MobileInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileInfoDrawer({
  isOpen,
  onClose,
  children,
}: MobileInfoDrawerProps) {
  // Lock body scroll khi drawer mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/40 z-40 transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[85vw] max-w-[360px] bg-white z-50
          shadow-[-4px_0_24px_rgba(0,0,0,0.12)]
          flex flex-col overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">
            Thông tin chi tiết
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
