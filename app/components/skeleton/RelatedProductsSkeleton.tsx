import ProductCardSkeleton from "./ProductCardSkeleton";
import SkeletonText from "./SkeletonText";
import styles from "./Skeleton.module.css";

export default function RelatedProductsSkeleton() {
  return (
    <section className={styles.productRelated} aria-hidden="true">
      <SkeletonText width="280px" height="34px" />
      <div className={styles.productRelatedGrid}>
        {Array.from({ length: 5 }).map((_, index) => (
          <ProductCardSkeleton key={`related-products-skeleton-${index}`} />
        ))}
      </div>
    </section>
  );
}
