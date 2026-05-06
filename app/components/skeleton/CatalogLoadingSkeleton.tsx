import ProductCardSkeleton from "./ProductCardSkeleton";
import SkeletonBlock from "./SkeletonBlock";
import SkeletonText from "./SkeletonText";
import styles from "./Skeleton.module.css";

export default function CatalogLoadingSkeleton() {
  return (
    <main className={styles.catalogShell} role="status" aria-live="polite" aria-label="Cargando catálogo">
      <section className={styles.catalogContext} aria-hidden="true">
        <div className={styles.catalogTop}>
          <SkeletonText width="220px" height="12px" />
          <SkeletonText width="90px" height="12px" />
        </div>
        <div className={styles.catalogHead}>
          <SkeletonText width="220px" height="34px" />
          <SkeletonText width="200px" height="14px" />
        </div>
      </section>

      <section className={styles.catalogLayout} aria-hidden="true">
        <aside className={styles.catalogSidebar}>
          <SkeletonText width="120px" height="16px" />
          <div className={styles.catalogFilterGroup}>
            <SkeletonText width="80px" height="12px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
          </div>
          <div className={styles.catalogFilterGroup}>
            <SkeletonText width="86px" height="12px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="999px" />
          </div>
          <div className={styles.catalogFilterGroup}>
            <SkeletonText width="72px" height="12px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="8px" />
            <SkeletonBlock className={styles.catalogFilterItem} radius="8px" />
          </div>
        </aside>

        <div className={styles.catalogContent}>
          <div className={styles.catalogToolbar}>
            <SkeletonText width="200px" height="12px" />
            <SkeletonText width="140px" height="12px" />
          </div>

          <section className={styles.catalogProducts}>
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={`catalog-product-skeleton-${index}`} />
            ))}
          </section>

          <div className={styles.catalogPagination}>
            <SkeletonBlock className={styles.catalogPagePill} radius="10px" />
            <SkeletonBlock className={styles.catalogPagePill} radius="10px" />
            <SkeletonBlock className={styles.catalogPagePill} radius="10px" />
            <SkeletonBlock className={styles.catalogPagePill} radius="10px" />
          </div>
        </div>
      </section>
    </main>
  );
}
