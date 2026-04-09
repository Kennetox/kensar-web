"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type HomeProductCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
};

export default function HomeProductCarousel({
  children,
  ariaLabel = "Carrusel de productos del hogar",
}: HomeProductCarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const items = useMemo(() => Children.toArray(children), [children]);
  const logicalCount = items.length;
  const loopItems = useMemo(() => {
    if (!logicalCount) return [];
    const repeated: ReactNode[] = [];

    for (let cycle = 0; cycle < 3; cycle += 1) {
      items.forEach((item, itemIndex) => {
        if (isValidElement(item)) {
          repeated.push(cloneElement(item, { key: `home-carousel-${cycle}-${itemIndex}` }));
        } else {
          repeated.push(
            <div key={`home-carousel-${cycle}-${itemIndex}`}>
              {item}
            </div>
          );
        }
      });
    }

    return repeated;
  }, [items, logicalCount]);
  const [itemStep, setItemStep] = useState(0);
  const [index, setIndex] = useState(logicalCount);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    setIndex(logicalCount);
  }, [logicalCount]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const firstItem = track?.querySelector(".home-product-carousel-item") as HTMLElement | null;
    if (!viewport || !track || !firstItem) return;

    const syncStep = () => {
      const firstWidth = firstItem.getBoundingClientRect().width;
      const styles = window.getComputedStyle(track);
      const gapValue = parseFloat(styles.columnGap || styles.gap || "0");
      const nextStep = Math.max(1, Math.round(firstWidth + gapValue));
      setItemStep(nextStep);
    };

    syncStep();
    const observer = new ResizeObserver(syncStep);
    observer.observe(viewport);
    observer.observe(firstItem);
    return () => observer.disconnect();
  }, [loopItems, logicalCount]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function scheduleTransitionRestore() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = window.requestAnimationFrame(() => {
      setTransitionEnabled(true);
      frameRef.current = null;
    });
  }

  function move(direction: 1 | -1) {
    if (!logicalCount) return;
    setTransitionEnabled(true);
    setIndex((prev) => prev + direction);
  }

  function handleTransitionEnd() {
    if (!logicalCount) return;

    if (index >= logicalCount * 2) {
      setTransitionEnabled(false);
      setIndex(logicalCount);
      scheduleTransitionRestore();
      return;
    }

    if (index < logicalCount) {
      setTransitionEnabled(false);
      setIndex(logicalCount * 2 - 1);
      scheduleTransitionRestore();
    }
  }

  return (
    <div className="home-product-carousel">
      <button
        type="button"
        className="home-product-carousel-nav home-product-carousel-nav-left"
        onClick={() => move(-1)}
        aria-label="Ver productos anteriores"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14.5 5 7.5 12l7 7" />
        </svg>
      </button>

      <div ref={viewportRef} className="home-product-carousel-viewport" aria-label={ariaLabel}>
        <div
          ref={trackRef}
          className={`home-product-carousel-track${transitionEnabled ? " is-animated" : ""}`}
          style={{
            transform: itemStep > 0 ? `translate3d(-${index * itemStep}px, 0, 0)` : undefined,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {loopItems}
        </div>
      </div>

      <button
        type="button"
        className="home-product-carousel-nav home-product-carousel-nav-right"
        onClick={() => move(1)}
        aria-label="Ver más productos"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9.5 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
