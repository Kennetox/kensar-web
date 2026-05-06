"use client";

import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";

type HomeProductCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
};

function getVisibleCount(width: number) {
  if (width <= 520) return 2;
  if (width <= 760) return 2;
  if (width <= 1080) return 3;
  if (width <= 1220) return 4;
  return 5;
}

export default function HomeProductCarousel({
  children,
  ariaLabel = "Carrusel de productos del hogar",
}: HomeProductCarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stepAnimationTimerRef = useRef<number | null>(null);
  const items = useMemo(() => Children.toArray(children), [children]);
  const logicalCount = items.length;
  const [visibleCount, setVisibleCount] = useState(5);
  const [canMovePrev, setCanMovePrev] = useState(false);
  const [canMoveNext, setCanMoveNext] = useState(false);
  const [stepDirection, setStepDirection] = useState<"" | "next" | "prev">("");
  const [progressOffset, setProgressOffset] = useState(0);
  const [progressSize, setProgressSize] = useState(100);

  const effectiveVisibleCount = Math.max(1, Math.min(visibleCount, logicalCount || 1));
  const canSlide = logicalCount > effectiveVisibleCount;
  useEffect(() => {
    return () => {
      if (stepAnimationTimerRef.current) {
        window.clearTimeout(stepAnimationTimerRef.current);
      }
    };
  }, []);

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

  const syncScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canSlide) {
      setCanMovePrev(false);
      setCanMoveNext(false);
      setProgressOffset(0);
      setProgressSize(100);
      return;
    }

    const epsilon = 2;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const size = Math.max(16, Math.min(100, (viewport.clientWidth / viewport.scrollWidth) * 100));
    const travel = Math.max(0, 100 - size);
    const offset = maxScroll > 0 ? (viewport.scrollLeft / maxScroll) * travel : 0;

    setCanMovePrev(viewport.scrollLeft > epsilon);
    setCanMoveNext(viewport.scrollLeft < viewport.scrollWidth - viewport.clientWidth - epsilon);
    setProgressSize(size);
    setProgressOffset(offset);
  }, [canSlide]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener("scroll", syncScrollState, { passive: true });
    const observer = new ResizeObserver(() => {
      viewport.dispatchEvent(new Event("scroll"));
    });
    observer.observe(viewport);
    viewport.dispatchEvent(new Event("scroll"));
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", syncScrollState);
    };
  }, [items, syncScrollState]);

  function move(direction: 1 | -1) {
    const viewport = viewportRef.current;
    if (!viewport || !canSlide) return;

    const cards = Array.from(
      viewport.querySelectorAll<HTMLElement>(".home-product-carousel-item")
    );
    if (!cards.length) return;

    const currentLeft = viewport.scrollLeft;
    const epsilon = 2;
    let nextLeft = currentLeft;

    if (direction === 1) {
      const nextCard = cards.find((card) => card.offsetLeft > currentLeft + epsilon);
      nextLeft = nextCard ? nextCard.offsetLeft : viewport.scrollWidth - viewport.clientWidth;
    } else {
      const previousCards = cards.filter((card) => card.offsetLeft < currentLeft - epsilon);
      nextLeft = previousCards.length ? previousCards[previousCards.length - 1].offsetLeft : 0;
    }
    const nextStepDirection = direction === 1 ? "next" : "prev";
    setStepDirection(nextStepDirection);
    if (stepAnimationTimerRef.current) {
      window.clearTimeout(stepAnimationTimerRef.current);
    }
    stepAnimationTimerRef.current = window.setTimeout(() => {
      setStepDirection("");
      stepAnimationTimerRef.current = null;
    }, 320);

    viewport.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: "smooth",
    });
  }

  return (
    <div
      className={`home-product-carousel${canSlide ? "" : " is-static"}`}
      style={
        {
          "--home-carousel-visible": effectiveVisibleCount,
          "--home-carousel-progress-offset": `${progressOffset}%`,
          "--home-carousel-progress-size": `${progressSize}%`,
        } as CSSProperties
      }
    >
      {canSlide ? (
        <button
          type="button"
          className="home-product-carousel-nav home-product-carousel-nav-left"
          onClick={() => move(-1)}
          aria-label="Ver productos anteriores"
          disabled={!canMovePrev}
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
          className={`home-product-carousel-track${canSlide ? "" : " is-static"}${
            stepDirection ? ` is-step-${stepDirection}` : ""
          }`}
        >
          {items}
        </div>
      </div>
      <div className="home-product-carousel-progress" aria-hidden="true">
        <span className="home-product-carousel-progress-fill" />
      </div>

      {canSlide ? (
        <button
          type="button"
          className="home-product-carousel-nav home-product-carousel-nav-right"
          onClick={() => move(1)}
          aria-label="Ver más productos"
          disabled={!canMoveNext}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9.5 5 7 7-7 7" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
