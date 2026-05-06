"use client";

import { useEffect } from "react";

const HIDE_CLASS = "topbar-utility-hidden";

export default function TopbarScrollBehavior() {
  useEffect(() => {
    let rafId = 0;
    let lastY = window.scrollY;
    let hidden = false;
    let directionStreak = 0;

    function setHidden(nextHidden: boolean) {
      if (hidden === nextHidden) return;
      hidden = nextHidden;
      document.body.classList.toggle(HIDE_CLASS, nextHidden);
    }

    function evaluate() {
      rafId = 0;
      const width = window.innerWidth;
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      lastY = currentY;

      if (currentY <= 8) {
        directionStreak = 0;
        setHidden(false);
        return;
      }

      const isMobile = width <= 1100;
      const hideDelta = isMobile ? 1.5 : 6;
      const hideOffset = isMobile ? 28 : 110;
      const showDelta = isMobile ? -1.5 : -6;

      if (delta > hideDelta) {
        directionStreak = Math.max(0, directionStreak) + 1;
      } else if (delta < showDelta) {
        directionStreak = Math.min(0, directionStreak) - 1;
      }

      if (currentY > hideOffset && directionStreak >= 2) {
        setHidden(true);
        return;
      }

      if (directionStreak <= -1) {
        setHidden(false);
      }
    }

    function onScrollOrResize() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(evaluate);
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    evaluate();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafId) window.cancelAnimationFrame(rafId);
      document.body.classList.remove(HIDE_CLASS);
    };
  }, []);

  return null;
}
