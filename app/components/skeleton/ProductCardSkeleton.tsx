import SkeletonBlock from "./SkeletonBlock";
import SkeletonText from "./SkeletonText";
import styles from "./Skeleton.module.css";

export default function ProductCardSkeleton() {
  return (
    <article className={styles.productCard} aria-hidden="true">
      <SkeletonBlock className={styles.productMedia} radius="16px" />
      <div className={styles.chips}>
        <SkeletonText width="108px" height="20px" className={styles.chip} />
        <SkeletonText width="86px" height="20px" className={styles.chip} />
      </div>
      <SkeletonText width="92%" height="18px" />
      <SkeletonText width="74%" height="18px" />
      <div className={styles.priceRow}>
        <SkeletonText width="46%" height="32px" />
        <SkeletonText width="28%" height="22px" />
      </div>
      <SkeletonBlock className={styles.cta} radius="0" />
    </article>
  );
}
