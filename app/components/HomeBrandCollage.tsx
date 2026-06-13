"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import SkeletonBlock from "./skeleton/SkeletonBlock";

type BrandCollageEntry = {
  image_url?: string | null;
  href?: string | null;
};

type BrandCollageResponse = Record<string, BrandCollageEntry>;

type BrandTile = {
  key: "main" | "top_left" | "top_right" | "bottom";
  brand: string;
  href: string;
  image: string;
  className: string;
};

const DEFAULT_BRAND_TILES: BrandTile[] = [
  {
    key: "main",
    brand: "Yamaha",
    href: "/catalogo?brand=Yamaha",
    image: "/brands/collage/hero-yamaha.webp",
    className: "brand-tile-main",
  },
  {
    key: "top_left",
    brand: "Pro DJ",
    href: "/catalogo?brand=Pro%20DJ",
    image: "/brands/collage/title-prodj.webp",
    className: "brand-tile-top-left",
  },
  {
    key: "top_right",
    brand: "Ritmo Musical",
    href: "/catalogo?brand=Ritmo%20Musical",
    image: "/brands/collage/title-rm1.webp",
    className: "brand-tile-top-right",
  },
  {
    key: "bottom",
    brand: "Spain",
    href: "/catalogo?brand=Spain",
    image: "/brands/collage/banner-spain.webp",
    className: "brand-tile-bottom",
  },
];

export default function HomeBrandCollage() {
  const [brandCollage, setBrandCollage] = useState<BrandCollageResponse | null>(null);
  const [collageReady, setCollageReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/brand-collage", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload || typeof payload !== "object") return;
        setBrandCollage(payload as BrandCollageResponse);
      })
      .catch(() => {
        if (active) setBrandCollage(null);
      })
      .finally(() => {
        if (active) setCollageReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolvedTiles = useMemo(
    () =>
      DEFAULT_BRAND_TILES.map((item) => {
        const configured = brandCollage?.[item.key];
        return {
          ...item,
          image: configured?.image_url?.trim() || item.image,
          href: configured?.href?.trim() || item.href,
        };
      }),
    [brandCollage]
  );

  return (
    <section className="commerce-brand-collage" aria-label="Marcas que respaldan tu sonido">
      <Reveal className="commerce-brand-collage-head">
        <p className="commerce-section-kicker">Marcas destacadas</p>
        <h2>Marcas que respaldan tu sonido</h2>
      </Reveal>

      {!collageReady ? (
        <div className="brand-collage-grid" aria-hidden="true">
          <SkeletonBlock className="brand-tile brand-tile-main" radius="0" />
          <SkeletonBlock className="brand-tile brand-tile-top-left" radius="0" />
          <SkeletonBlock className="brand-tile brand-tile-top-right" radius="0" />
          <SkeletonBlock className="brand-tile brand-tile-bottom" radius="0" />
        </div>
      ) : (
        <div className="brand-collage-grid">
          {resolvedTiles.map((tile) => (
            <Link
              key={tile.key}
              href={tile.href}
              className={`brand-tile ${tile.className}`}
              aria-label={`Explorar ${tile.brand}`}
            >
              <div
                className="brand-tile-image"
                style={{ backgroundImage: `url('${tile.image}')` }}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
