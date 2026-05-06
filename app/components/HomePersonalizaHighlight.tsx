import Link from "next/link";
import Image from "next/image";
import styles from "./HomePersonalizaHighlight.module.css";
import { PERSONALIZABLE_PRODUCTS } from "@/app/personaliza/_config/presets";

const PERSONALIZABLE_FAMILIES = PERSONALIZABLE_PRODUCTS.map((item) => ({
  ...item,
  description: item.description,
  isComingSoon: false,
  shortLabel:
    item.id === "campana" ? "Campana" : item.id === "guiro" ? "Guiro" : "Maracas",
}));

export default function HomePersonalizaHighlight() {
  return (
    <section className={styles.section} aria-label="Personaliza tu instrumento">
      <div className={styles.intro}>
        <p className={styles.kicker}>Personaliza Kensar</p>
        <h2>Diseña tu campana, güiro o maraca</h2>
        <p className={styles.copy}>Elige un modelo, personaliza tu diseño y recibe atención directa.</p>
      </div>

      <div className={styles.grid}>
        {PERSONALIZABLE_FAMILIES.map((item) =>
          item.isComingSoon ? (
            <div key={item.id} className={styles.item}>
              <div
                className={`${styles.imageTile} ${styles.imageTileDisabled}`}
                aria-label={`${item.name} próximamente`}
                role="img"
              >
                <div className={styles.media}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    unoptimized
                    className={styles.mediaImage}
                  />
                </div>
                <span className={styles.tileTitle}>{item.shortLabel}</span>
                <span className={styles.soonBadge}>Próximamente</span>
              </div>
            </div>
          ) : (
            <div key={item.id} className={styles.item}>
              <Link
                href={item.id === "campana" ? "/personaliza?seleccion=campana" : `/personaliza?producto=${item.id}`}
                scroll
                className={styles.imageTile}
                aria-label={`Personalizar ${item.name}`}
              >
                <div className={styles.media}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    unoptimized
                    className={styles.mediaImage}
                  />
                </div>
                <span className={styles.tileTitle}>{item.shortLabel}</span>
              </Link>
            </div>
          )
        )}
      </div>
    </section>
  );
}
