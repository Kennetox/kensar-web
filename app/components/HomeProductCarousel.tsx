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
  type TransitionEvent,
} from "react";

type HomeProductCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
};

const LOOP_CYCLES = 15;
const MIDDLE_CYCLE_INDEX = Math.floor(LOOP_CYCLES / 2);
const MIN_ITEMS_FOR_LOOP = 7;

export default function HomeProductCarousel({
  children,
  ariaLabel = "Carrusel de productos del hogar",
}: HomeProductCarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const items = useMemo(() => Children.toArray(children), [children]);
  const logicalCount = items.length;
  const loopEnabled = logicalCount >= MIN_ITEMS_FOR_LOOP;
  const loopItems = useMemo(() => {
    if (!logicalCount) return [];
    if (!loopEnabled) return items;
    const repeated: ReactNode[] = [];

    for (let cycle = 0; cycle < LOOP_CYCLES; cycle += 1) {
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
  }, [items, logicalCount, loopEnabled]);
  const [itemStep, setItemStep] = useState(0);
  const [index, setIndex] = useState(
    loopEnabled ? MIDDLE_CYCLE_INDEX * Math.max(1, logicalCount) : 0
  );
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const firstItem = track?.querySelector(".home-product-carousel-item") as HTMLElement | null;
    if (!viewport || !track || !firstItem) return;

    const syncStep = () => {
      const firstWidth = firstItem.getBoundingClientRect().width;
      const styles = window.getComputedStyle(track);
      const gapValue = parseFloat(styles.columnGap || styles.gap || "0");
      const nextStep = Math.max(1, firstWidth + gapValue);
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
    if (!loopEnabled || !logicalCount || isAnimating) return;
    setIsAnimating(true);
    setTransitionEnabled(true);
    setIndex((prev) => prev + direction);
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== trackRef.current) return;
    if (!logicalCount || !loopEnabled) return;

    const cycleOffset = ((index % logicalCount) + logicalCount) % logicalCount;
    const recenterIndex = MIDDLE_CYCLE_INDEX * logicalCount + cycleOffset;
    const lowerLimit = logicalCount;
    const upperLimit = logicalCount * (LOOP_CYCLES - 2) - 1;
    if (index <= lowerLimit || index >= upperLimit) {
      setTransitionEnabled(false);
      setIndex(recenterIndex);
      setIsAnimating(false);
      scheduleTransitionRestore();
      return;
    }

    setIsAnimating(false);
  }

  return (
    <div className={`home-product-carousel${loopEnabled ? "" : " is-static"}`}>
      {loopEnabled ? (
        <button
          type="button"
          className="home-product-carousel-nav home-product-carousel-nav-left"
          onClick={() => move(-1)}
          aria-label="Ver productos anteriores"
          disabled={isAnimating}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5 7.5 12l7 7" />
          </svg>
        </button>
      ) : null}

      <div
        ref={viewportRef}
        className={`home-product-carousel-viewport${loopEnabled ? "" : " is-static"}`}
        aria-label={ariaLabel}
      >
        <div
          ref={trackRef}
          className={`home-product-carousel-track${transitionEnabled && loopEnabled ? " is-animated" : ""}${loopEnabled ? "" : " is-static"}`}
          style={{
            transform:
              loopEnabled && itemStep > 0
                ? `translate3d(-${index * itemStep}px, 0, 0)`
                : undefined,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {loopItems}
        </div>
      </div>

      {loopEnabled ? (
        <button
          type="button"
          className="home-product-carousel-nav home-product-carousel-nav-right"
          onClick={() => move(1)}
          aria-label="Ver más productos"
          disabled={isAnimating}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9.5 5 7 7-7 7" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
