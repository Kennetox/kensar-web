import SkeletonBlock from "./SkeletonBlock";
import SkeletonText from "./SkeletonText";
import CarouselSkeleton from "./CarouselSkeleton";
import styles from "./Skeleton.module.css";

export default function HomeLoadingSkeleton() {
  return (
    <div className={styles.home} role="status" aria-live="polite" aria-label="Cargando inicio">
      <SkeletonBlock className={styles.hero} radius="20px" />

      <section className={styles.personaliza} aria-hidden="true">
        <div className={styles.personalizaHead}>
          <SkeletonText width="140px" height="11px" />
          <SkeletonText width="360px" height="28px" />
          <SkeletonText width="420px" height="14px" />
        </div>
        <div className={styles.personalizaGrid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={`personaliza-skeleton-${index}`} className={styles.personalizaCard} radius="14px" />
          ))}
        </div>
      </section>

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
