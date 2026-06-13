import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

type SkeletonBlockProps = {
  className?: string;
  radius?: string;
  style?: CSSProperties;
};

export default function SkeletonBlock({ className = "", radius, style }: SkeletonBlockProps) {
  return (
    <div
      className={`${styles.skeletonBase} ${styles.block} ${className}`.trim()}
      style={
        {
          ...(radius ? ({ "--skeleton-radius": radius } as CSSProperties) : null),
          ...style,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}
