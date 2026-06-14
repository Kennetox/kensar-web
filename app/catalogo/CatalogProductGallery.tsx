"use client";

import Link from "next/link";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="catalog-gallery-arrow-icon"
      aria-hidden="true"
      focusable="false"
    >
      {direction === "left" ? (
        <path d="M14.5 5.5L8.5 12l6 6.5" />
      ) : (
        <path d="M9.5 5.5l6 6.5-6 6.5" />
      )}
    </svg>
  );
}

export default function CatalogProductGallery({
  detailHref,
  gallery,
  imageUrl,
  imageThumbUrl,
}: {
  detailHref: string;
  gallery: string[];
  imageUrl: string | null;
  imageThumbUrl: string | null;
}) {
  const images = useMemo(() => {
    const candidates = [...gallery, imageUrl, imageThumbUrl];
    return candidates.filter((value, index, list): value is string =>
      Boolean(value) && list.indexOf(value) === index
    );
  }, [gallery, imageThumbUrl, imageUrl]);
  const [imageIndex, setImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [slideTick, setSlideTick] = useState(0);
  const [activeImageFit, setActiveImageFit] = useState<"cover" | "contain">("cover");
  const activeImage = images[imageIndex] || null;

  useEffect(() => {
    images.forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, [images]);

  useEffect(() => {
    if (!activeImage) return;
    const image = new window.Image();
    image.src = activeImage;
    image.onload = () => {
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      if (!width || !height) {
        setActiveImageFit("cover");
        return;
      }
      const ratio = width / height;
      const isExtremeRatio = ratio < 0.75 || ratio > 1.35;
      setActiveImageFit(isExtremeRatio ? "contain" : "cover");
    };
    image.onerror = () => {
      setActiveImageFit("cover");
    };
  }, [activeImage]);

  function stepImage(direction: -1 | 1) {
    if (images.length <= 1) return;
    setSlideDirection(direction > 0 ? "right" : "left");
    setImageIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
    setSlideTick((prev) => prev + 1);
  }

  function handleArrowPointerDown(event: PointerEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    stepImage(direction);
  }

  return (
    <>
      <Link href={detailHref} prefetch={false} className="catalog-product-card-media-link">
        <div
          key={`${activeImage ?? "fallback"}-${slideTick}`}
          className={`storefront-media-image is-slide-${slideDirection}${activeImage && activeImageFit === "contain" ? " is-smart-contain" : ""}`}
          style={{
            backgroundImage: activeImage
              ? `url('${activeImage}')`
              : "url('/branding/icono-white.svg'), linear-gradient(135deg, #d9e4f3 0%, #c9d8ee 100%)",
            backgroundSize: activeImage ? undefined : "36%, cover",
            backgroundPosition: "center center, center center",
            backgroundRepeat: "no-repeat, no-repeat",
          }}
        />
      </Link>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="catalog-gallery-arrow is-left"
            onPointerDown={(event) => handleArrowPointerDown(event, -1)}
            aria-label="Imagen anterior"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            className="catalog-gallery-arrow is-right"
            onPointerDown={(event) => handleArrowPointerDown(event, 1)}
            aria-label="Imagen siguiente"
          >
            <ArrowIcon direction="right" />
          </button>
        </>
      ) : null}
    </>
  );
}
