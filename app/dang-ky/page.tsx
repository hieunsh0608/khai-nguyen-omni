"use client";

// ============================================================
// /dang-ky — Trang đăng ký độc lập cho khách hàng
// Dùng SharedRegistrationForm (Single Source of Truth).
// Layout: Full-page + logo header + footer.
// cskh param tracking qua URL (?cskh=Tên_Nhân_Viên).
// ============================================================

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SharedRegistrationForm } from "@/components/dang-ky/SharedRegistrationForm";

function RegistrationPageContent() {
  const searchParams = useSearchParams();
  const cskhName = searchParams.get("cskh") ?? "";

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-slate-100 via-red-50 to-slate-100 flex flex-col items-center justify-start py-10 px-4">
      {/* ── Header ── */}
      <header className="flex flex-col items-center mb-8 text-center">
        <img
          src="/logo.png"
          alt="Logo Khai Nguyên Hoa Ngữ"
          className="h-24 w-24 object-contain mx-auto mb-4 bg-white p-2 rounded-3xl border border-gray-100 shadow-xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
        />
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Khai Nguyên Hoa Ngữ
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Trung tâm tiếng Trung uy tín tại Hải Dương
        </p>
      </header>

      {/* ── Card ── */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-red-600 to-red-700" />
        <div className="px-6 pt-6 pb-8">
          <SharedRegistrationForm
            cskh={cskhName}
            idPrefix="page-dk"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 space-y-1 pb-6">
        <p className="font-medium text-slate-500">Khai Nguyên Hoa Ngữ</p>
        <p>Gia Lộc · Hải Dương · Online</p>
        <p>© {new Date().getFullYear()} — Mọi quyền được bảo lưu</p>
      </footer>
    </div>
  );
}

export default function DangKyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-red-50">
          <Loader2 className="animate-spin text-red-500" size={32} />
        </div>
      }
    >
      <RegistrationPageContent />
    </Suspense>
  );
}
