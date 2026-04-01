"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export default function ProductDetailGallery({
  productName,
  gallery,
}: {
  productName: string;
  gallery: string[];
}) {
  const images = useMemo(() => {
    const unique: string[] = [];
    for (const image of gallery) {
      if (!image || unique.includes(image)) continue;
      unique.push(image);
    }
    return unique;
  }, [gallery]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  if (!images.length) {
    return (
      <div className="product-gallery-shell is-no-images">
        <div className="product-main-visual product-main-visual-empty" aria-label={`Imagen de ${productName}`} />
      </div>
    );
  }

  const activeImage = images[activeIndex] || images[0];

  return (
    <div className="product-gallery-shell">
      <div className="product-thumb-rail">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={`product-gallery-thumb${index === activeIndex ? " is-active" : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Ver imagen ${index + 1}`}
          >
            <Image
              src={image}
              alt={`Miniatura ${index + 1} de ${productName}`}
              fill
              sizes="84px"
              unoptimized
            />
          </button>
        ))}
      </div>

      <div
        className={`product-main-visual${zoomActive ? " is-zooming" : ""}`}
        aria-label={`Imagen principal de ${productName}`}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          setZoomActive(true);
        }}
        onPointerLeave={() => setZoomActive(false)}
        onPointerMove={(event) => {
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

        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="product-main-arrow is-left"
              onPointerEnter={() => setZoomActive(false)}
              onClick={() =>
                setActiveIndex((prev) => (prev <= 0 ? images.length - 1 : prev - 1))
              }
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
              onClick={() =>
                setActiveIndex((prev) => (prev >= images.length - 1 ? 0 : prev + 1))
              }
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
              {activeIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
