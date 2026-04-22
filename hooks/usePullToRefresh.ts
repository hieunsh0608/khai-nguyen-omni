"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Hook Pull-to-Refresh cho PWA mobile.
 * Trả về props cần gắn vào container và component indicator.
 */
export function usePullToRefresh() {
    const [pulling, setPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const startY = useRef(0);
    const isPulling = useRef(false);

    const THRESHOLD = 80; // px cần kéo để trigger refresh

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        // Chỉ kích hoạt nếu scroll ở top
        const el = e.currentTarget as HTMLElement;
        if (el.scrollTop > 0) return;
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current) return;
        const diff = e.touches[0].clientY - startY.current;
        if (diff > 0) {
            setPulling(true);
            setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5)); // giảm tốc
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!isPulling.current) return;
        isPulling.current = false;

        if (pullDistance >= THRESHOLD) {
            setRefreshing(true);
            setPullDistance(THRESHOLD * 0.6);
            // Reload trang
            setTimeout(() => {
                window.location.reload();
            }, 300);
        } else {
            setPulling(false);
            setPullDistance(0);
        }
    }, [pullDistance]);

    return {
        pulling,
        pullDistance,
        refreshing,
        touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    };
}
