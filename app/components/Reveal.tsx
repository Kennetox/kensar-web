"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: "none" | "short" | "mid" | "long";
  direction?: "up" | "left" | "right";
  speed?: "normal" | "slow" | "fast";
  id?: string;
};

export default function Reveal({
  children,
  className = "",
  delay = "none",
  direction = "up",
  speed = "normal",
  id,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const classes = [
    "reveal",
    `reveal-${direction}`,
    `reveal-speed-${speed}`,
    visible ? "reveal-visible" : "",
    delay !== "none" ? `reveal-${delay}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} id={id} className={classes}>
      {children}
    </div>
  );
}
