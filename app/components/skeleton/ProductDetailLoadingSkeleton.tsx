import ProductCardSkeleton from "./ProductCardSkeleton";
import SkeletonBlock from "./SkeletonBlock";
import SkeletonText from "./SkeletonText";
import styles from "./Skeleton.module.css";

export default function ProductDetailLoadingSkeleton() {
  return (
    <main className={styles.productShell} role="status" aria-live="polite" aria-label="Cargando producto">
      <section className={styles.productBreadcrumbs} aria-hidden="true">
        <SkeletonText width="120px" height="12px" />
        <SkeletonText width="70px" height="12px" />
        <SkeletonText width="110px" height="12px" />
        <SkeletonText width="160px" height="12px" />
      </section>

      <section className={styles.productGrid} aria-hidden="true">
        <article className={styles.productVisualCard}>
          <div className={styles.productGallery}>
            <div className={styles.productThumbRail}>
              <SkeletonBlock className={styles.productThumb} radius="10px" />
              <SkeletonBlock className={styles.productThumb} radius="10px" />
              <SkeletonBlock className={styles.productThumb} radius="10px" />
            </div>
            <SkeletonBlock className={styles.productMainVisual} radius="0" />
          </div>
          <div className={styles.productDescription}>
            <SkeletonText width="140px" height="24px" />
            <SkeletonText width="100%" height="12px" />
            <SkeletonText width="96%" height="12px" />
            <SkeletonText width="90%" height="12px" />
          </div>
        </article>

        <aside className={styles.productInfoCard}>
          <div className={styles.productInfoStack}>
            <SkeletonText width="72%" height="14px" />
            <SkeletonText width="84%" height="36px" />
            <SkeletonText width="40%" height="40px" />
            <SkeletonText width="56%" height="14px" />
            <SkeletonBlock className={styles.productInfoBlock} radius="12px" />
            <SkeletonBlock className={styles.productInfoBlock} radius="12px" />
            <SkeletonBlock className={styles.productCtaLarge} radius="12px" />
            <SkeletonBlock className={styles.productCtaLarge} radius="12px" />
          </div>
        </aside>
      </section>

      <section className={styles.productRelated} aria-hidden="true">
        <SkeletonText width="280px" height="34px" />
        <div className={styles.productRelatedGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={`pdp-related-skeleton-${index}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
