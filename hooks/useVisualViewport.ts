"use client";

import { useState, useEffect } from "react";

/**
 * Hook để lấy chiều cao thực tế của visual viewport trên iOS.
 * Khi bàn phím ảo mở trên iOS PWA, window.innerHeight KHÔNG thay đổi,
 * nhưng window.visualViewport.height CÓ thay đổi.
 * 
 * Trả về chiều cao visual viewport (px) hoặc undefined nếu chưa sẵn sàng.
 */
export function useVisualViewport() {
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        // Chỉ chạy trên client
        if (typeof window === "undefined") return;

        const vv = window.visualViewport;
        if (!vv) {
            // Fallback cho trình duyệt cũ
            setHeight(window.innerHeight);
            return;
        }

        const update = () => {
            setHeight(vv.height);
        };

        // Set giá trị ban đầu
        update();

        // Lắng nghe thay đổi (khi keyboard mở/đóng)
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);

        return () => {
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
        };
    }, []);

    return height;
}
