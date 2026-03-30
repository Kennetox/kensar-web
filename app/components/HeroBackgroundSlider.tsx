"use client";

import { useCallback, useEffect, useState } from "react";

type HeroBackgroundSliderProps = {
  images: string[];
  intervalMs?: number;
  speed?: number;
  onSlideChange?: (index: number) => void;
};

export default function HeroBackgroundSlider({
  images,
  intervalMs = 5000,
  speed = 0.08,
  onSlideChange,
}: HeroBackgroundSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  const goToNextSlide = useCallback(() => {
    if (images.length < 2) return;
    setActiveIndex((current) => (current + 1) % images.length);
  }, [images.length]);

  const goToPrevSlide = useCallback(() => {
    if (images.length < 2) return;
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length < 2) return;

    const timer = window.setInterval(() => {
      goToNextSlide();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [goToNextSlide, intervalMs]);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        setOffset(window.scrollY * speed);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  useEffect(() => {
    onSlideChange?.(activeIndex);
  }, [activeIndex, onSlideChange]);

  return (
    <>
      <div className="hero-slider" aria-hidden="true">
        {images.map((image, index) => (
          <div
            key={image}
            className={`hero-slider-layer${index === activeIndex ? " hero-slider-layer-active" : ""}`}
            style={{
              backgroundImage: `url('${image}')`,
              transform: `translate3d(0, ${offset}px, 0) scale(1.08)`,
            }}
          />
        ))}
      </div>

      {images.length > 1 ? (
        <>
          <div className="hero-slider-side hero-slider-side-prev">
            <button
              type="button"
              className="hero-slider-nav hero-slider-nav-prev"
              aria-label="Slide anterior"
              onClick={goToPrevSlide}
            >
              &#8249;
            </button>
          </div>

          <div className="hero-slider-side hero-slider-side-next">
            <button
              type="button"
              className="hero-slider-nav hero-slider-nav-next"
              aria-label="Siguiente slide"
              onClick={goToNextSlide}
            >
              &#8250;
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
