import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

type SkeletonBlockProps = {
  className?: string;
  radius?: string;
};

export default function SkeletonBlock({ className = "", radius }: SkeletonBlockProps) {
  return (
    <div
      className={`${styles.skeletonBase} ${styles.block} ${className}`.trim()}
      style={radius ? ({ "--skeleton-radius": radius } as CSSProperties) : undefined}
      aria-hidden="true"
    />
  );
}
