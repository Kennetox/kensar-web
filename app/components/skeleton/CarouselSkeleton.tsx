import ProductCardSkeleton from "./ProductCardSkeleton";
import styles from "./Skeleton.module.css";

type CarouselSkeletonProps = {
  count?: number;
};

export default function CarouselSkeleton({ count = 5 }: CarouselSkeletonProps) {
  return (
    <div className={styles.carousel} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={`carousel-skeleton-${index}`} />
      ))}
    </div>
  );
}
