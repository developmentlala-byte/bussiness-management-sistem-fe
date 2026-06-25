"use client";

import { useEffect, useState } from "react";

export function useVisualViewportHeight() {
  const [height, setHeight] = useState<string>("90dvh");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      // 90% dari visual viewport yang sebenarnya
      setHeight(`${Math.floor(vh * 0.9)}px`);
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
