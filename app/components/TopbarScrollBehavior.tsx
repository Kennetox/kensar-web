"use client";

import { useEffect } from "react";

const HIDE_CLASS = "topbar-utility-hidden";

export default function TopbarScrollBehavior() {
  useEffect(() => {
    let rafId = 0;
    let lastY = window.scrollY;
    let hidden = false;

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

      // On tablet/mobile this utility bar is already hidden by layout rules.
      if (width <= 1100) {
        setHidden(false);
        return;
      }

      if (currentY <= 8) {
        setHidden(false);
        return;
      }

      if (delta > 6 && currentY > 110) {
        setHidden(true);
        return;
      }

      if (delta < -6) {
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
