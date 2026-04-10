"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ENABLED_PATHS = new Set(["/", "/catalogo", "/empresa"]);
const SHOW_DISTANCE_TO_BOTTOM = 320;
const HIDE_DISTANCE_TO_BOTTOM = 760;
const MIN_SCROLL_TO_ENABLE = 220;

function isEnabledPath(pathname: string): boolean {
  return ENABLED_PATHS.has(pathname);
}

export default function BackToTopButton() {
  const pathname = usePathname();
  const enabled = isEnabledPath(pathname);
  const [visible, setVisible] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const distanceToBottom = maxScroll - scrollTop;
      const canEnable = scrollTop > MIN_SCROLL_TO_ENABLE;
      const showZone = distanceToBottom <= SHOW_DISTANCE_TO_BOTTOM;
      const hideZone = distanceToBottom > HIDE_DISTANCE_TO_BOTTOM || !canEnable;

      setVisible((current) => {
        if (showZone && canEnable) return true;
        if (current && !hideZone) return true;
        return false;
      });

      lastScrollYRef.current = scrollTop;
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <button
      type="button"
      className={`back-to-top-btn${visible ? " is-visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver al inicio de la página"
      title="Volver arriba"
    >
      <span aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 18V6" />
          <path d="m6.75 11.25 5.25-5.25 5.25 5.25" />
        </svg>
      </span>
    </button>
  );
}
