"use client";

import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type HomeProductCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
};

function getVisibleCount(width: number) {
  if (width <= 520) return 1;
  if (width <= 760) return 2;
  if (width <= 1080) return 3;
  if (width <= 1320) return 4;
  return 5;
}

export default function HomeProductCarousel({
  children,
  ariaLabel = "Carrusel de productos del hogar",
}: HomeProductCarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const items = useMemo(() => Children.toArray(children), [children]);
  const logicalCount = items.length;
  const [visibleCount, setVisibleCount] = useState(5);
  const [index, setIndex] = useState(0);
  const [lastDirection, setLastDirection] = useState<1 | -1>(1);
  const [hasInteracted, setHasInteracted] = useState(false);

  const effectiveVisibleCount = Math.max(1, Math.min(visibleCount, logicalCount || 1));
  const maxIndex = Math.max(0, logicalCount - effectiveVisibleCount);
  const currentIndex = Math.min(index, maxIndex);
  const canSlide = logicalCount > effectiveVisibleCount;

  const visibleItems = useMemo(
    () => items.slice(currentIndex, currentIndex + effectiveVisibleCount),
    [items, currentIndex, effectiveVisibleCount]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const syncVisibleCount = () => {
      setVisibleCount(getVisibleCount(viewport.clientWidth));
    };

    syncVisibleCount();
    const observer = new ResizeObserver(syncVisibleCount);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  function move(direction: 1 | -1) {
    if (!canSlide) return;
    setLastDirection(direction);
    setHasInteracted(true);
    setIndex((prev) => {
      const base = Math.min(prev, maxIndex);
      return Math.min(maxIndex, Math.max(0, base + direction));
    });
  }

  return (
    <div
      className={`home-product-carousel${canSlide ? "" : " is-static"}`}
      style={{ "--home-carousel-visible": effectiveVisibleCount } as CSSProperties}
    >
      {canSlide ? (
        <button
          type="button"
          className="home-product-carousel-nav home-product-carousel-nav-left"
          onClick={() => move(-1)}
          aria-label="Ver productos anteriores"
          disabled={currentIndex === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5 7.5 12l7 7" />
          </svg>
        </button>
      ) : null}

      <div
        ref={viewportRef}
        className={`home-product-carousel-viewport${canSlide ? "" : " is-static"}`}
        aria-label={ariaLabel}
      >
        <div
          key={currentIndex}
          className={`home-product-carousel-track${canSlide ? "" : " is-static"}${
            hasInteracted ? ` is-step-${lastDirection === 1 ? "next" : "prev"}` : ""
          }`}
        >
          {visibleItems}
        </div>
      </div>

      {canSlide ? (
        <button
          type="button"
          className="home-product-carousel-nav home-product-carousel-nav-right"
          onClick={() => move(1)}
          aria-label="Ver más productos"
          disabled={currentIndex >= maxIndex}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9.5 5 7 7-7 7" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
