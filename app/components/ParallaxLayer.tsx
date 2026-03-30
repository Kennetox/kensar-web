"use client";

import { useEffect, useState } from "react";

type ParallaxLayerProps = {
  className: string;
  backgroundImage: string;
  speed?: number;
};

export default function ParallaxLayer({ className, backgroundImage, speed = 0.12 }: ParallaxLayerProps) {
  const [offset, setOffset] = useState(0);

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

  return (
    <div
      className={className}
      style={{
        backgroundImage,
        transform: `translate3d(0, ${offset}px, 0) scale(1.08)`,
      }}
    />
  );
}
