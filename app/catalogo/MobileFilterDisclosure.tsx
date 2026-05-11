"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type MobileFilterDisclosureProps = {
  children: ReactNode;
};

export default function MobileFilterDisclosure({ children }: MobileFilterDisclosureProps) {
  const disclosureRef = useRef<HTMLDivElement | null>(null);
  const [showFloating, setShowFloating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const scrollDisclosureToTop = (behavior: ScrollBehavior = "smooth") => {
    const disclosureNode = disclosureRef.current;
    if (!disclosureNode) return;
    const topbarHeightRaw = getComputedStyle(document.documentElement).getPropertyValue("--topbar-current-height");
    const topbarHeight = Number.parseFloat(topbarHeightRaw) || 0;
    const targetTop = disclosureNode.getBoundingClientRect().top + window.scrollY - topbarHeight;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
  };

  useEffect(() => {
    const evaluateFloating = () => {
      const disclosureNode = disclosureRef.current;
      if (!disclosureNode) return;
      if (window.matchMedia("(min-width: 721px)").matches) {
        setShowFloating(false);
        return;
      }

      const top = disclosureNode.getBoundingClientRect().top + window.scrollY;
      const shouldFloat = window.scrollY > top + 120;
      setShowFloating(shouldFloat && !isOpen);
    };

    evaluateFloating();
    window.addEventListener("scroll", evaluateFloating, { passive: true });
    window.addEventListener("resize", evaluateFloating);
    return () => {
      window.removeEventListener("scroll", evaluateFloating);
      window.removeEventListener("resize", evaluateFloating);
    };
  }, [isOpen]);

  const openFilters = () => {
    if (!disclosureRef.current) return;
    setIsOpen(true);
    requestAnimationFrame(() => {
      scrollDisclosureToTop("smooth");
      window.setTimeout(() => {
        scrollDisclosureToTop("auto");
      }, 170);
    });
    setShowFloating(false);
  };

  const handleSummaryClick = () => {
    setIsOpen((current) => !current);
  };

  return (
    <>
      <div ref={disclosureRef} className={`catalog-filter-disclosure catalog-filter-mobile${isOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="catalog-filter-disclosure-summary"
          onClick={handleSummaryClick}
          aria-expanded={isOpen}
          aria-controls="catalog-filter-panel-mobile"
        >
          <span>Filtrar y ordenar</span>
          <span className="catalog-filter-disclosure-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
          </span>
        </button>
        <aside id="catalog-filter-panel-mobile" className="catalog-sidebar">
          {children}
        </aside>
      </div>

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
