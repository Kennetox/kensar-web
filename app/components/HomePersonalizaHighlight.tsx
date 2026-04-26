import Link from "next/link";
import Image from "next/image";
import styles from "./HomePersonalizaHighlight.module.css";
import { PERSONALIZABLE_PRODUCTS } from "@/app/personaliza/_config/presets";

const PERSONALIZABLE_FAMILIES = PERSONALIZABLE_PRODUCTS.map((item) => ({
  ...item,
  description:
    item.id === "maraca" ? "Disponible pronto en el editor." : item.description,
  isComingSoon: item.id === "maraca",
  shortLabel:
    item.id === "campana" ? "Campana" : item.id === "guiro" ? "Guiro" : "Maracas",
}));

export default function HomePersonalizaHighlight() {
  return (
    <section className={styles.section} aria-label="Personaliza tu instrumento">
      <div className={styles.bannerWrap}>
        <Image
          src="/sliders/home/banner-personaliza.png"
          alt="Banner de personalización Kensar"
          width={1920}
          height={640}
          sizes="100vw"
          unoptimized
          className="commerce-next-banner-image"
        />
      </div>

      <div className={styles.grid}>
        {PERSONALIZABLE_FAMILIES.map((item) =>
          item.isComingSoon ? (
            <div key={item.id} className={styles.item}>
              <div
                className={`${styles.circleButton} ${styles.circleButtonDisabled}`}
                aria-label={`${item.name} próximamente`}
                role="img"
              >
                <div className={styles.media}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 900px) 44vw, 22vw"
                    className={styles.mediaImage}
                  />
                </div>
                <span className={styles.soonBadge}>Próximamente</span>
              </div>
              <span className={styles.itemTitle}>{item.shortLabel}</span>
            </div>
          ) : (
            <div key={item.id} className={styles.item}>
              <Link
                href="/personaliza"
                className={styles.circleButton}
                aria-label={`Personalizar ${item.name}`}
              >
                <div className={styles.media}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 900px) 44vw, 22vw"
                    className={styles.mediaImage}
                  />
                </div>
              </Link>
              <span className={styles.itemTitle}>{item.shortLabel}</span>
            </div>
          )
        )}
      </div>
    </section>
  );
}
