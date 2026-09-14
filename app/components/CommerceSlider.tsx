"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SlideItem = {
  id: string;
  image: string;
  mobileImage?: string | null;
  alt: string;
  href: string | null;
  ctaLabel?: string | null;
  ctaXPercent?: number;
  ctaYPercent?: number;
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
  showFeaturedCategories?: boolean;
  intervalMs?: number;
};

export default function CommerceSlider({
  slides,
  categories,
  showFeaturedCategories = true,
  intervalMs = 8000,
}: CommerceSliderProps) {
  const hasLoop = slides.length > 1;
  const loopSlides = useMemo(
    () => (hasLoop ? [slides[slides.length - 1], ...slides, slides[0]] : slides),
    [hasLoop, slides],
  );
  const [internalIndex, setInternalIndex] = useState(hasLoop ? 1 : 0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [slideMediaReady, setSlideMediaReady] = useState<Record<string, boolean>>({});
  const [categoryMediaReady, setCategoryMediaReady] = useState<Record<string, boolean>>({});
  const activeIndex = hasLoop ? (internalIndex - 1 + slides.length) % slides.length : 0;

  const mediaSourceFor = useCallback(
    (slide: SlideItem) => (isMobileViewport && slide.mobileImage ? slide.mobileImage : slide.image),
    [isMobileViewport],
  );

  const mediaKeyFor = useCallback((slide: SlideItem) => `${slide.id}-${mediaSourceFor(slide)}`, [mediaSourceFor]);

  const markSlideReady = useCallback((key: string) => {
    setSlideMediaReady((current) => (current[key] ? current : { ...current, [key]: true }));
  }, []);

  const handleSlideReady = useCallback(
    (key: string, index: number) => {
      markSlideReady(key);
      if (pendingIndex !== index) return;

      setPendingIndex(null);
      setIsAnimating(true);
      setTransitionEnabled(true);
      setInternalIndex(index);
    },
    [markSlideReady, pendingIndex],
  );

  const markCategoryReady = useCallback((key: string) => {
    setCategoryMediaReady((current) => (current[key] ? current : { ...current, [key]: true }));
  }, []);

  const requestSlide = useCallback(
    (nextIndex: number) => {
      if (!hasLoop || isAnimating || pendingIndex !== null) return;
      const nextSlide = loopSlides[nextIndex];
      if (!nextSlide) return;

      // If the next banner is not in the small active/next cache yet, load it
      // off-screen first. The current banner remains visible until it is ready.
      if (!slideMediaReady[mediaKeyFor(nextSlide)]) {
        setPendingIndex(nextIndex);
        return;
      }

      setIsAnimating(true);
      setTransitionEnabled(true);
      setInternalIndex(nextIndex);
    },
    [hasLoop, isAnimating, loopSlides, mediaKeyFor, pendingIndex, slideMediaReady],
  );

  const goToNextSlide = useCallback(() => {
    requestSlide(internalIndex + 1);
  }, [internalIndex, requestSlide]);

  const goToPrevSlide = useCallback(() => {
    requestSlide(internalIndex - 1);
  }, [internalIndex, requestSlide]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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

  function renderSlideFrame(slide: SlideItem, index: number) {
    const mediaSrc = mediaSourceFor(slide);
    const mediaKey = mediaKeyFor(slide);
    // Do not request every banner (and its loop clones) on initial render.
    // The active frame keeps the same visual quality; the next frame loads
    // when the user or timer actually reaches it.
    const shouldLoadMedia = index === internalIndex || index === internalIndex + 1 || index === pendingIndex;
    const mediaReady = !shouldLoadMedia || Boolean(slideMediaReady[mediaKey]);
    const hasPresetStyle = slide.id === "guitarras" || slide.id === "audio-main" || slide.id === "contacto";
    const ctaPositionStyle = {
      left: `${typeof slide.ctaXPercent === "number" ? slide.ctaXPercent : 50}%`,
      top: `${typeof slide.ctaYPercent === "number" ? slide.ctaYPercent : 80}%`,
    } as const;
    const customCtaStyle = hasPresetStyle
      ? undefined
      : {
          position: "relative" as const,
          background: "rgba(255, 255, 255, 0.86)",
          color: "#0f172a",
          boxShadow: "0 12px 24px -16px rgba(15, 23, 42, 0.52)",
          border: "1px solid rgba(255, 255, 255, 0.45)",
        };

    return (
      <div
        key={`${slide.id}-${index}`}
        className={`commerce-slider-frame commerce-slider-frame-${slide.id}${!mediaReady ? " is-loading" : ""}${index === internalIndex ? " is-active" : ""}${
          hasLoop && (index === 0 || index === loopSlides.length - 1) ? " is-clone" : ""
        }`}
      >
        {slide.href ? <Link href={slide.href} className="commerce-slider-link" aria-label={slide.alt} /> : null}
        {shouldLoadMedia ? (
          <Image
            src={mediaSrc}
            alt=""
            className="commerce-slider-preload"
            width={1}
            height={1}
            unoptimized
            aria-hidden="true"
            onLoad={() => handleSlideReady(mediaKey, index)}
            onError={() => handleSlideReady(mediaKey, index)}
          />
        ) : null}
        <div
          className="commerce-slider-layer"
          style={{
            backgroundImage: mediaReady ? `url('${mediaSrc}')` : undefined,
          }}
          role="img"
          aria-label={slide.alt}
        />
        {!mediaReady ? <div className="commerce-slider-frame-skeleton" aria-hidden="true" /> : null}
        {!isMobileViewport && (slide.ctaLabel || "").trim() ? (
          hasPresetStyle ? (
            <div className="commerce-slider-cta-shell">
              {slide.href ? (
                <Link
                  href={slide.href}
                  className={`commerce-slider-cta commerce-slider-cta--${slide.id}`}
                  aria-label={slide.ctaLabel || undefined}
                >
                  {slide.ctaLabel}
                </Link>
              ) : (
                <span className={`commerce-slider-cta commerce-slider-cta--${slide.id}`} aria-hidden="true">
                  {slide.ctaLabel}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                zIndex: 8,
                ...ctaPositionStyle,
                transform: "translate(-50%, -50%)",
              }}
            >
              {slide.href ? (
                <Link
                  href={slide.href}
                  className={`commerce-slider-cta commerce-slider-cta--${slide.id}`}
                  aria-label={slide.ctaLabel || undefined}
                  style={customCtaStyle}
                >
                  {slide.ctaLabel}
                </Link>
              ) : (
                <span
                  className={`commerce-slider-cta commerce-slider-cta--${slide.id}`}
                  aria-hidden="true"
                  style={customCtaStyle}
                >
                  {slide.ctaLabel}
                </span>
              )}
            </div>
          )
        ) : null}
      </div>
    );
  }

  function renderCategoryCard(category: FeaturedCategory) {
    const categoryKey = `${category.id}-${category.imageUrl || ""}`;
    const categoryReady = !category.imageUrl || Boolean(categoryMediaReady[categoryKey]);

    return (
      <Link
        key={`featured-${category.id}`}
        href={category.href}
        className={`commerce-featured-card${!categoryReady ? " is-loading" : ""}`}
      >
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt=""
            className="commerce-featured-card-preload"
            width={1}
            height={1}
            unoptimized
            aria-hidden="true"
            onLoad={() => markCategoryReady(categoryKey)}
            onError={() => markCategoryReady(categoryKey)}
          />
        ) : null}
        <div
          className={`commerce-featured-card-image${category.imageUrl ? " has-image" : ""}`}
          style={
            category.imageUrl
              ? { backgroundImage: `url('${category.imageUrl}')` }
              : undefined
          }
          aria-hidden="true"
        />
        {!categoryReady ? <div className="commerce-featured-card-skeleton" aria-hidden="true" /> : null}
        <h3>{category.name}</h3>
      </Link>
    );
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
          {loopSlides.map((slide, index) => renderSlideFrame(slide, index))}
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
                    requestSlide(index + 1);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {showFeaturedCategories ? (
        <div className="commerce-featured-shell">
          <div className="commerce-featured-intro" aria-label="Accesos rapidos de categorias">
            <div className="commerce-featured-intro-copy">
              <p className="commerce-section-kicker">Categorias destacadas</p>
              <h2>Explora por tipo de producto</h2>
              <p>Elige una categoria y compra mas rapido.</p>
            </div>
          </div>

          <div className="commerce-featured-categories" aria-label="Categorias principales">
            {categories.map((category) => renderCategoryCard(category))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
