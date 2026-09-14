import SkeletonBlock from "./SkeletonBlock";
import SkeletonText from "./SkeletonText";
import CarouselSkeleton from "./CarouselSkeleton";
import styles from "./Skeleton.module.css";

export default function HomeLoadingSkeleton() {
  return (
    <div className={styles.home} role="status" aria-live="polite" aria-label="Cargando inicio">
      <SkeletonBlock className={styles.hero} radius="20px" />

      <section className={styles.section} aria-hidden="true">
        <SkeletonText width="420px" height="36px" />
        <CarouselSkeleton />
      </section>

      <section className={styles.section} aria-hidden="true">
        <SkeletonText width="170px" height="12px" />
        <SkeletonText width="440px" height="34px" />
        <SkeletonText width="520px" height="14px" />
        <CarouselSkeleton />
      </section>
    </div>
  );
}
