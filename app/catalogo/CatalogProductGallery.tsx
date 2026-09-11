"use client";

import Link from "next/link";
import type { PointerEvent } from "react";
import { useMemo, useState } from "react";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="catalog-gallery-arrow-icon" aria-hidden="true" focusable="false">
      {direction === "left" ? <path d="M14.5 5.5L8.5 12l6 6.5" /> : <path d="M9.5 5.5l6 6.5-6 6.5" />}
    </svg>
  );
}

function resolveCardThumbnail(imageUrl: string | null, imageThumbUrl: string | null): string | null {
  if (!imageUrl || (imageThumbUrl && imageThumbUrl !== imageUrl)) return imageThumbUrl || imageUrl;
  const match = imageUrl.match(/^(https?:\/\/[^/]+)?(\/uploads\/product-images\/)(.+)$/);
  if (!match) return imageUrl;
  const [, origin = "", prefix, relativePath] = match;
  const segments = relativePath.split("/");
  const filename = segments.pop();
  if (!filename) return imageUrl;
  const extensionIndex = filename.lastIndexOf(".");
  const stem = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  return `${origin}${prefix}${segments.join("/")}${segments.length ? "/" : ""}thumbnails/thumb-${stem}.webp`;
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
    // The first request is the compact thumbnail. Other gallery files are
    // requested only when the visitor presses an arrow.
    const candidates = [resolveCardThumbnail(imageUrl, imageThumbUrl), ...gallery.filter((image) => image !== imageUrl)];
    return candidates.filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
  }, [gallery, imageThumbUrl, imageUrl]);
  const [imageIndex, setImageIndex] = useState(0);
  const activeImage = images[imageIndex] || null;

  function stepImage(event: PointerEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    setImageIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <>
      <Link href={detailHref} prefetch={false} className="catalog-product-card-media-link">
        <div
          className="storefront-media-image"
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
          <button type="button" className="catalog-gallery-arrow is-left" onPointerDown={(event) => stepImage(event, -1)} aria-label="Imagen anterior">
            <ArrowIcon direction="left" />
          </button>
          <button type="button" className="catalog-gallery-arrow is-right" onPointerDown={(event) => stepImage(event, 1)} aria-label="Imagen siguiente">
            <ArrowIcon direction="right" />
          </button>
        </>
      ) : null}
    </>
  );
}
