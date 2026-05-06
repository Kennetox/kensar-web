import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

type SkeletonTextProps = {
  width?: string;
  height?: string;
  className?: string;
};

export default function SkeletonText({ width = "100%", height = "12px", className = "" }: SkeletonTextProps) {
  return (
    <div
      className={`${styles.skeletonBase} ${styles.text} ${className}`.trim()}
      style={{ width, "--skeleton-height": height } as CSSProperties}
      aria-hidden="true"
    />
  );
}
