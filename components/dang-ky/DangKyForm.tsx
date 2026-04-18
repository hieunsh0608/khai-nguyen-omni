"use client";

// ============================================================
// DangKyForm — Wrapper hiển thị SharedRegistrationForm
// Dùng khi activeTab === "dang-ky" trên NavBar dashboard.
// Chỉ là layout wrapper — logic form nằm trong SharedRegistrationForm.
// ============================================================

import { SharedRegistrationForm } from "@/components/dang-ky/SharedRegistrationForm";

export function DangKyForm() {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-100 via-red-50/30 to-slate-100 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-500 via-red-600 to-red-700" />
          <div className="px-6 pt-6 pb-8">
            <SharedRegistrationForm idPrefix="tab-dk" />
          </div>
        </div>
      </div>
    </div>
  );
}
