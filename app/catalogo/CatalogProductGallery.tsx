"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CatalogProductGallery({
  slug,
  gallery,
  imageUrl,
  imageThumbUrl,
}: {
  slug: string;
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
  const activeImage = images[imageIndex] || null;

  useEffect(() => {
    images.forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, [images]);

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

  return (
    <>
      <Link href={`/catalogo/${slug}`} className="catalog-product-card-media-link">
        <div
          key={`${activeImage ?? "fallback"}-${slideTick}`}
          className={`storefront-media-image is-slide-${slideDirection}`}
          style={{
            backgroundImage: activeImage
              ? `url('${activeImage}')`
              : "url('/branding/icono-white.svg'), linear-gradient(135deg, #d9e4f3 0%, #c9d8ee 100%)",
            backgroundSize: activeImage ? "cover" : "36%, cover",
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
            onClick={() => stepImage(-1)}
            aria-label="Imagen anterior"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="catalog-gallery-arrow is-right"
            onClick={() => stepImage(1)}
            aria-label="Imagen siguiente"
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      ) : null}
    </>
  );
}
