"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type GalleryItem =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string };

export default function ProductDetailGallery({
  productName,
  gallery,
  videoUrl,
}: {
  productName: string;
  gallery: string[];
  videoUrl?: string | null;
}) {
  const images = useMemo(() => {
    const unique: string[] = [];
    for (const image of gallery) {
      if (!image || unique.includes(image)) continue;
      unique.push(image);
    }
    return unique;
  }, [gallery]);
  const items = useMemo<GalleryItem[]>(() => {
    const imageItems = images.map((src) => ({ kind: "image", src }) satisfies GalleryItem);
    const trimmedVideo = (videoUrl || "").trim();
    if (!trimmedVideo) return imageItems;
    return [...imageItems, { kind: "video", src: trimmedVideo }];
  }, [images, videoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeItem = items[activeIndex] || items[0];
  const canNavigate = items.length > 1;
  const activeIsVideo = activeItem?.kind === "video";
  const activeImage = activeItem?.kind === "image" ? activeItem.src : null;

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    if (typeof window === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        return;
      }
      if (!canNavigate) return;
      if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigate, goNext, goPrev, lightboxOpen]);

  if (!items.length) {
    return (
      <div className="product-gallery-shell is-no-images">
        <div className="product-main-visual product-main-visual-empty" aria-label={`Imagen de ${productName}`} />
      </div>
    );
  }

  return (
    <>
      <div className="product-gallery-shell">
        <div className="product-thumb-rail">
          {items.map((item, index) => (
            <button
              key={`${item.kind}-${item.src}-${index}`}
              type="button"
              className={`product-gallery-thumb${index === activeIndex ? " is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={item.kind === "video" ? "Ver video del producto" : `Ver imagen ${index + 1}`}
            >
              {item.kind === "image" ? (
                <Image
                  src={item.src}
                  alt={`Miniatura ${index + 1} de ${productName}`}
                  fill
                  sizes="84px"
                  unoptimized
                />
              ) : (
                <div className="product-gallery-video-thumb" aria-hidden="true">
                  <span className="product-gallery-video-thumb-icon">▶</span>
                  <span>Video</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div
          className={`product-main-visual${zoomActive && !activeIsVideo ? " is-zooming" : ""}`}
          aria-label={`${activeIsVideo ? "Video" : "Imagen"} principal de ${productName}`}
          onClick={(event) => {
            if (activeIsVideo) return;
            const target = event.target as HTMLElement;
            if (target.closest(".product-main-arrow")) return;
            setLightboxOpen(true);
          }}
          onPointerEnter={(event) => {
            if (activeIsVideo) return;
            if (event.pointerType !== "mouse") return;
            setZoomActive(true);
          }}
          onPointerLeave={() => setZoomActive(false)}
          onPointerMove={(event) => {
            if (activeIsVideo) return;
            if (event.pointerType !== "mouse") return;
            const target = event.target as HTMLElement;
            if (target.closest(".product-main-arrow")) {
              if (zoomActive) setZoomActive(false);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
            const relativeY = ((event.clientY - rect.top) / rect.height) * 100;
            const x = Math.max(0, Math.min(100, relativeX));
            const y = Math.max(0, Math.min(100, relativeY));
            setZoomPosition({ x, y });
            if (!zoomActive) setZoomActive(true);
          }}
        >
          {activeIsVideo ? (
            <video
              key={`${activeItem.src}-${activeIndex}`}
              src={activeItem.src}
              className="product-main-video"
              controls
              preload="metadata"
            />
          ) : activeImage ? (
            <>
              <Image
                key={`${activeImage}-${activeIndex}`}
                src={activeImage}
                alt={`Imagen principal de ${productName}`}
                fill
                sizes="(max-width: 1100px) 100vw, 720px"
                unoptimized
                className="product-main-image"
              />
              <div
                className="product-main-zoom-layer"
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${activeImage})`,
                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                }}
              />
            </>
          ) : null}

          {canNavigate ? (
            <>
              <button
                type="button"
                className="product-main-arrow is-left"
                onPointerEnter={() => setZoomActive(false)}
                onClick={goPrev}
                aria-label="Imagen anterior"
              >
                <svg
                  className="product-main-arrow-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M15 6L9 12L15 18" />
                </svg>
              </button>
              <button
                type="button"
                className="product-main-arrow is-right"
                onPointerEnter={() => setZoomActive(false)}
                onClick={goNext}
                aria-label="Imagen siguiente"
              >
                <svg
                  className="product-main-arrow-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M9 6L15 12L9 18" />
                </svg>
              </button>
              <span className="product-main-counter">
                {activeIndex + 1} / {items.length}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {lightboxOpen && !activeIsVideo ? (
        <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`Galería de ${productName}`}>
          <button
            type="button"
            className="product-lightbox-backdrop"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar galería"
          />
          <div className="product-lightbox-panel">
            <button
              type="button"
              className="product-lightbox-close"
              onClick={() => setLightboxOpen(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="product-lightbox-image-wrap">
              <Image
                key={`lightbox-${activeImage}-${activeIndex}`}
                src={activeImage || ""}
                alt={`Vista ampliada ${activeIndex + 1} de ${productName}`}
                fill
                sizes="100vw"
                unoptimized
                className="product-lightbox-image"
              />
            </div>
            {canNavigate ? (
              <>
                <button
                  type="button"
                  className="product-lightbox-arrow is-left"
                  onClick={goPrev}
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="product-lightbox-arrow is-right"
                  onClick={goNext}
                  aria-label="Imagen siguiente"
                >
                  ›
                </button>
                <span className="product-lightbox-counter">
                  {activeIndex + 1} / {items.length}
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
