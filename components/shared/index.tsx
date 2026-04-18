"use client";

// ============================================================
// Shared Components — AvatarFallback, InfoRow, FormField
// Dùng chung bởi nhiều tính năng
// ============================================================

import { useState } from "react";

/**
 * Avatar placeholder hiển thị chữ cái đầu tiên của tên.
 */
export function AvatarFallback({
  name,
  size = "w-10 h-10",
  textSize = "text-sm",
  bgColor = "bg-gray-200",
}: {
  name?: string | null;
  size?: string;
  textSize?: string;
  bgColor?: string;
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() || "?";
  return (
    <div className={`${size} rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <span className={`${textSize} font-semibold text-gray-500`}>{initial}</span>
    </div>
  );
}

/**
 * Info row — hiển thị một dòng thông tin với icon + label + value.
 */
export function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: string;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-xs mt-0.5">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-gray-700 mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

/**
 * Form field — input đơn giản có label.
 */
export function FormField({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium block mb-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-2 bg-gray-50 outline-none focus:border-blue-400 focus:bg-white transition-colors"
      />
    </div>
  );
}

/**
 * Channel Badge — Badge icon Zalo / Facebook / Generic.
 */
function ZaloIcon() {
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-400 rounded-full border-[1.5px] border-white flex items-center justify-center">
      <span className="text-white text-[7px] font-bold leading-none">Z</span>
    </div>
  );
}

function FacebookIcon() {
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full border-[1.5px] border-white flex items-center justify-center">
      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    </div>
  );
}

export function ChannelBadge({ nguonDen }: { nguonDen: string | null }) {
  if (nguonDen?.toLowerCase().includes("zalo")) return <ZaloIcon />;
  if (nguonDen?.toLowerCase().includes("facebook")) return <FacebookIcon />;
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-400 rounded-full border-[1.5px] border-white flex items-center justify-center">
      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      </svg>
    </div>
  );
}

/**
 * GroupBadge — Icon nhóm nhỏ ở góc dưới phải avatar.
 */
export function GroupBadge() {
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-indigo-500 rounded-full border-[1.5px] border-white flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.97 5.97 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.97 5.97 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
      </svg>
    </div>
  );
}

/**
 * TimKiemHocVien — Component tìm kiếm khách hàng theo Tên/SĐT.
 * Dùng chung bởi: TaoNhomModal, TabThongTinNhom, TabThongTinHocVien.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase/client";
import type { KhachHangResult } from "@/types/ui";

export function TimKiemHocVien({
  label = "Tìm học viên",
  placeholder = "Nhập tên hoặc SĐT...",
  onSelect,
  selected,
  onRemove,
  multi = false,
  excludeIds = [],
}: {
  label?: string;
  placeholder?: string;
  onSelect: (kh: KhachHangResult) => void;
  selected?: KhachHangResult[];
  onRemove?: (id: string) => void;
  multi?: boolean;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KhachHangResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search — query Supabase ilike
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      const { data } = await supabase
        .from("khach_hang")
        .select("id, zalo_id, ho_ten, sdt, avatar")
        .or(`ho_ten.ilike.%${q}%,sdt.ilike.%${q}%`)
        .not("zalo_id", "is", null)
        .limit(12);

      const filtered = excludeIds.length > 0
        ? ((data as KhachHangResult[]) || []).filter((r) => !excludeIds.includes(r.id))
        : ((data as KhachHangResult[]) || []);

      setResults(filtered);
      setSearching(false);
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, excludeIds.join(",")]);

  const handleSelect = (kh: KhachHangResult) => {
    onSelect(kh);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>

      {/* Selected tags */}
      {selected && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((kh) => (
            <span
              key={kh.id}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-200"
            >
              {kh.avatar ? (
                <img src={kh.avatar} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
              ) : (
                <AvatarFallback name={kh.ho_ten} size="w-4 h-4" textSize="text-[8px]" bgColor="bg-indigo-200" />
              )}
              <span className="max-w-[80px] truncate">{kh.ho_ten || kh.sdt || "?"}</span>
              {onRemove && (
                <button
                  onClick={() => onRemove(kh.id)}
                  className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-indigo-200 hover:bg-indigo-400 text-indigo-600 hover:text-white transition-colors flex-shrink-0"
                  title="Xóa"
                >
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      {(multi || !selected || selected.length === 0) && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-gray-50 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-gray-300"
          />
          {searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Dropdown results */}
          {query.trim() && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {results.slice(0, 8).map((kh) => (
                <button
                  key={kh.id}
                  onClick={() => handleSelect(kh)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 transition-colors text-left"
                >
                  {kh.avatar ? (
                    <img src={kh.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <AvatarFallback name={kh.ho_ten} size="w-7 h-7" textSize="text-[10px]" bgColor="bg-indigo-100" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{kh.ho_ten || "—"}</p>
                    {kh.sdt && <p className="text-[10px] text-gray-400">{kh.sdt}</p>}
                  </div>
                </button>
              ))}
              {results.length === 0 && !searching && (
                <p className="text-[11px] text-gray-400 text-center py-3">Không tìm thấy (hoặc đã thêm hết)</p>
              )}
            </div>
          )}
          {/* Kết quả rỗng sau khi filter */}
          {query.trim() && results.length === 0 && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-3 py-2.5">
              <p className="text-[11px] text-gray-400 text-center">Không tìm thấy ai phù hợp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
