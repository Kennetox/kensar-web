"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type MobileFilterDisclosureProps = {
  children: ReactNode;
};

export default function MobileFilterDisclosure({ children }: MobileFilterDisclosureProps) {
  const COLLAPSE_ANIMATION_MS = 320;
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [showFloating, setShowFloating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const evaluateFloating = () => {
      const detailsNode = detailsRef.current;
      if (!detailsNode) return;
      if (window.matchMedia("(min-width: 721px)").matches) {
        setShowFloating(false);
        return;
      }

      const top = detailsNode.getBoundingClientRect().top + window.scrollY;
      const shouldFloat = window.scrollY > top + 120;
      setShowFloating(shouldFloat && !detailsNode.open);
    };

    evaluateFloating();
    window.addEventListener("scroll", evaluateFloating, { passive: true });
    window.addEventListener("resize", evaluateFloating);
    return () => {
      window.removeEventListener("scroll", evaluateFloating);
      window.removeEventListener("resize", evaluateFloating);
    };
  }, []);

  const openFilters = () => {
    const detailsNode = detailsRef.current;
    if (!detailsNode) return;
    setIsClosing(false);
    detailsNode.open = true;
    const topbarHeightRaw = getComputedStyle(document.documentElement).getPropertyValue("--topbar-current-height");
    const topbarHeight = Number.parseFloat(topbarHeightRaw) || 0;
    const targetTop = detailsNode.getBoundingClientRect().top + window.scrollY - topbarHeight - 8;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
    setShowFloating(false);
  };

  const handleSummaryClick = (event: React.MouseEvent<HTMLElement>) => {
    const detailsNode = detailsRef.current;
    if (!detailsNode) return;

    if (!detailsNode.open) {
      setIsClosing(false);
      return;
    }

    event.preventDefault();
    setIsClosing(true);
    window.setTimeout(() => {
      const activeDetails = detailsRef.current;
      if (!activeDetails) return;
      activeDetails.open = false;
      setIsClosing(false);
    }, COLLAPSE_ANIMATION_MS);
  };

  return (
    <>
      <details
        ref={detailsRef}
        className={`catalog-filter-disclosure catalog-filter-mobile${isClosing ? " is-collapsing" : ""}`}
      >
        <summary className="catalog-filter-disclosure-summary" onClick={handleSummaryClick}>
          <span>Filtrar y ordenar</span>
          <span className="catalog-filter-disclosure-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
          </span>
        </summary>
        <aside className="catalog-sidebar">{children}</aside>
      </details>

      {showFloating ? (
        <button type="button" className="catalog-filter-floating-trigger is-visible" onClick={openFilters}>
          <span>Filtrar</span>
          <span className="catalog-filter-disclosure-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
          </span>
        </button>
      ) : null}
    </>
  );
}
