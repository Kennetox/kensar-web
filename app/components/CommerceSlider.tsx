"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SlideItem = {
  id: string;
  image: string;
  alt: string;
  href: string;
  ctaLabel: string;
};

type FeaturedCategory = {
  id: string;
  href: string;
  name: string;
  imageUrl: string | null;
};

type CommerceSliderProps = {
  slides: SlideItem[];
  categories: FeaturedCategory[];
  intervalMs?: number;
};

export default function CommerceSlider({ slides, categories, intervalMs = 8000 }: CommerceSliderProps) {
  const hasLoop = slides.length > 1;
  const loopSlides = hasLoop ? [slides[slides.length - 1], ...slides, slides[0]] : slides;
  const [internalIndex, setInternalIndex] = useState(hasLoop ? 1 : 0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const activeIndex = hasLoop ? (internalIndex - 1 + slides.length) % slides.length : 0;

  const goToNextSlide = useCallback(() => {
    if (!hasLoop || isAnimating) return;
    setIsAnimating(true);
    setTransitionEnabled(true);
    setInternalIndex((current) => current + 1);
  }, [hasLoop, isAnimating]);

  const goToPrevSlide = useCallback(() => {
    if (!hasLoop || isAnimating) return;
    setIsAnimating(true);
    setTransitionEnabled(true);
    setInternalIndex((current) => current - 1);
  }, [hasLoop, isAnimating]);

  useEffect(() => {
    if (!hasLoop) return;
    const timer = window.setInterval(() => {
      if (!isAnimating) goToNextSlide();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [goToNextSlide, hasLoop, intervalMs, isAnimating]);

  useEffect(() => {
    if (transitionEnabled) return;
    const frame = window.requestAnimationFrame(() => {
      setTransitionEnabled(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [transitionEnabled]);

  function handleTrackTransitionEnd() {
    if (!hasLoop) return;

    if (internalIndex === slides.length + 1) {
      setTransitionEnabled(false);
      setInternalIndex(1);
      setIsAnimating(false);
      return;
    }

    if (internalIndex === 0) {
      setTransitionEnabled(false);
      setInternalIndex(slides.length);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(false);
  }

  return (
    <section className="commerce-slider-block" aria-label="Slider principal">
      <div className="commerce-slider-placeholder">
        <div
          className="commerce-slider-track"
          aria-live="polite"
          style={{
            transform: `translate3d(-${internalIndex * 100}%, 0, 0)`,
            transition: transitionEnabled ? undefined : "none",
          }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {loopSlides.map((slide, index) => (
            <div
              key={`${slide.id}-${index}`}
              className={`commerce-slider-frame commerce-slider-frame-${slide.id}${index === internalIndex ? " is-active" : ""}${
                hasLoop && (index === 0 || index === loopSlides.length - 1) ? " is-clone" : ""
              }`}
            >
              <Link href={slide.href} className="commerce-slider-link" aria-label={slide.alt} />
              <div
                className="commerce-slider-layer"
                style={{ backgroundImage: `url('${slide.image}')` }}
                role="img"
                aria-label={slide.alt}
              />
              <Link
                href={slide.href}
                className={`commerce-slider-cta commerce-slider-cta--${slide.id}`}
                aria-label={slide.ctaLabel}
              >
                {slide.ctaLabel}
              </Link>
            </div>
          ))}
        </div>

        {slides.length > 1 ? (
          <>
            <button type="button" className="commerce-slider-arrow commerce-slider-arrow-left" aria-label="Slide anterior" onClick={goToPrevSlide}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14.5 5 7.5 12l7 7" />
              </svg>
            </button>
            <button type="button" className="commerce-slider-arrow commerce-slider-arrow-right" aria-label="Siguiente slide" onClick={goToNextSlide}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m9.5 5 7 7-7 7" />
              </svg>
            </button>

            <div className="commerce-slider-dots" aria-label="Indicadores de slider">
              {slides.map((slide, index) => (
                <button
                  key={`dot-${slide.id}`}
                  type="button"
                  className={`commerce-slider-dot${index === activeIndex ? " is-active" : ""}`}
                  aria-label={`Ir al slide ${index + 1}`}
                  aria-current={index === activeIndex}
                  onClick={() => {
                    if (isAnimating) return;
                    setIsAnimating(true);
                    setTransitionEnabled(true);
                    setInternalIndex(index + 1);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="commerce-featured-categories" aria-label="Categorias principales">
        {categories.map((category) => (
          <Link key={`featured-${category.id}`} href={category.href} className="commerce-featured-card">
            <div
              className={`commerce-featured-card-image${category.imageUrl ? " has-image" : ""}`}
              style={
                category.imageUrl
                  ? { backgroundImage: `url('${category.imageUrl}')` }
                  : undefined
              }
              aria-hidden="true"
            />
            <h3>{category.name}</h3>
          </Link>
        ))}
      </div>

      <div className="commerce-featured-more">
        <Link href="/catalogo">Ver mas</Link>
      </div>
    </section>
  );
}
