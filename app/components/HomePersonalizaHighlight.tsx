"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./HomePersonalizaHighlight.module.css";
import SkeletonBlock from "./skeleton/SkeletonBlock";
import { PERSONALIZABLE_PRODUCTS } from "@/app/personaliza/_config/presets";

const DEFAULT_REVEAL_X = 50;
type HomePersonalizationImageEntry = {
  before_image_url?: string | null;
  after_image_url?: string | null;
};

type HomePersonalizationImagesResponse = Record<string, HomePersonalizationImageEntry>;

const PERSONALIZABLE_FAMILIES = PERSONALIZABLE_PRODUCTS.map((item) => ({
  ...item,
  shortLabel: item.id === "campana" ? "Campana" : item.id === "guiro" ? "Güiro" : "Maracas",
  beforeImage: item.homeBeforeImage || item.cardImage,
  afterImage: item.homeAfterImage || item.cardImage,
}));

function PersonalizeCard({
  item,
}: {
  item: (typeof PERSONALIZABLE_FAMILIES)[number];
}) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const revealValueRef = useRef(DEFAULT_REVEAL_X);
  const revealTargetRef = useRef(DEFAULT_REVEAL_X);
  const revealFrameRef = useRef<number | null>(null);

  const applyRevealValue = (value: number) => {
    const card = cardRef.current;
    if (!card) return;
    const next = Math.min(92, Math.max(8, value));
    revealValueRef.current = next;
    card.style.setProperty("--reveal-x", `${next.toFixed(2)}%`);
  };

  const stopRevealAnimation = () => {
    if (revealFrameRef.current !== null) {
      window.cancelAnimationFrame(revealFrameRef.current);
      revealFrameRef.current = null;
    }
  };

  const animateReveal = () => {
    const current = revealValueRef.current;
    const target = revealTargetRef.current;
    const delta = target - current;
    const next = Math.abs(delta) < 0.12 ? target : current + delta * 0.18;
    applyRevealValue(next);
    if (Math.abs(next - target) >= 0.12) {
      revealFrameRef.current = window.requestAnimationFrame(animateReveal);
    } else {
      revealFrameRef.current = null;
    }
  };

  const setRevealTarget = (target: number, active: boolean) => {
    const card = cardRef.current;
    if (!card) return;
    revealTargetRef.current = target;
    card.dataset.revealActive = active ? "true" : "false";
    stopRevealAnimation();
    revealFrameRef.current = window.requestAnimationFrame(animateReveal);
  };

  useEffect(() => {
    applyRevealValue(DEFAULT_REVEAL_X);
    return () => stopRevealAnimation();
  }, []);

  const href =
    item.id === "campana" ? "/personaliza?seleccion=campana" : `/personaliza?producto=${item.id}`;

  return (
    <Link
      href={href}
      className={styles.card}
      ref={cardRef}
      aria-label={`Abrir personalización de ${item.name}`}
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100));
        setRevealTarget(ratio, true);
      }}
      onPointerMove={(event: PointerEvent<HTMLAnchorElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100));
        setRevealTarget(ratio, true);
      }}
      onPointerLeave={() => {
        setRevealTarget(DEFAULT_REVEAL_X, false);
      }}
      onPointerCancel={() => {
        setRevealTarget(DEFAULT_REVEAL_X, false);
      }}
      style={{ "--reveal-x": `${DEFAULT_REVEAL_X}%` } as CSSProperties}
    >
      <div className={styles.mediaShell}>
        <div className={styles.mediaStage}>
          <div className={styles.mediaLayerBefore}>
            <Image
              src={item.beforeImage}
              alt={`${item.name} antes de personalizar`}
              fill
              sizes="(max-width: 900px) 100vw, 33vw"
              unoptimized
              className={styles.mediaImage}
            />
          </div>

          <div className={styles.mediaLayerAfter}>
            <Image
              src={item.afterImage}
              alt={`${item.name} después de personalizar`}
              fill
              sizes="(max-width: 900px) 100vw, 33vw"
              unoptimized
              className={styles.mediaImage}
            />
          </div>

          <div className={styles.revealLine} aria-hidden="true" />
          <div className={styles.shine} aria-hidden="true" />

          <div className={styles.titleBadge} aria-hidden="true">
            <span className={styles.titleBadgeText}>{item.shortLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePersonalizaHighlight() {
  const [homeImages, setHomeImages] = useState<HomePersonalizationImagesResponse | null>(null);
  const [homeImagesReady, setHomeImagesReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/personaliza/home-images", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload || typeof payload !== "object") return;
        setHomeImages(payload as HomePersonalizationImagesResponse);
      })
      .catch(() => {
        if (active) setHomeImages(null);
      })
      .finally(() => {
        if (active) setHomeImagesReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolvedFamilies = useMemo(
    () =>
      PERSONALIZABLE_FAMILIES.map((item) => {
        const configured = homeImages?.[item.id];
        return {
          ...item,
          beforeImage: configured?.before_image_url?.trim() || item.beforeImage,
          afterImage: configured?.after_image_url?.trim() || item.afterImage,
        };
      }),
    [homeImages]
  );

  return (
    <section className={styles.section} aria-label="Personaliza tu instrumento">
      <div className={styles.intro}>
        <p className={styles.kicker}>Personaliza Kensar</p>
        <h2>Antes y después, en una sola vista</h2>
      </div>

      {!homeImagesReady ? (
        <div className={styles.loadingGrid} aria-hidden="true">
          {PERSONALIZABLE_FAMILIES.map((item) => (
            <div key={`personaliza-loading-${item.id}`} className={styles.loadingCard}>
              <SkeletonBlock className={styles.loadingMedia} radius="0" />
              <div className={styles.loadingCopy}>
                <SkeletonBlock className={styles.loadingBadge} radius="999px" />
                <SkeletonBlock className={styles.loadingTitle} radius="8px" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {resolvedFamilies.map((item) => (
            <PersonalizeCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
