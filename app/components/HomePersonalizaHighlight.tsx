import Link from "next/link";
import styles from "./HomePersonalizaHighlight.module.css";

const PERSONALIZABLE_FAMILIES = [
  {
    id: "campana",
    name: "Campanas salseras",
    description: "Define tamaño, acabado y texto para tu campana.",
    mediaClass: styles.mediaCampana,
    iconClass: styles.iconCampana,
  },
  {
    id: "guiro",
    name: "Güiros salseros",
    description: "Personaliza color/degradado y agrega tu frase.",
    mediaClass: styles.mediaGuiro,
    iconClass: styles.iconGuiro,
  },
  {
    id: "maraca",
    name: "Maracas",
    description: "Crea una versión única para tu agrupación.",
    mediaClass: styles.mediaMaraca,
    iconClass: styles.iconMaraca,
  },
] as const;

export default function HomePersonalizaHighlight() {
  return (
    <section className={styles.section} aria-label="Personaliza tu instrumento">
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <p className={styles.kicker}>Personalización Kensar</p>
          <h2 className={styles.title}>Diseña tu campana, güiro o maraca</h2>
          <p className={styles.copy}>
            Configura estilo y texto en segundos con una vista previa 2D. Empieza por una de las
            tres familias disponibles.
          </p>
        </div>
        <Link href="/personaliza" className={styles.mainLink}>
          Abrir personalizador
        </Link>
      </div>

      <div className={styles.grid}>
        {PERSONALIZABLE_FAMILIES.map((item) => (
          <Link key={item.id} href={`/personaliza?producto=${item.id}`} className={styles.card}>
            <div className={`${styles.media} ${item.mediaClass}`}>
              <div className={`${styles.icon} ${item.iconClass}`} aria-hidden="true" />
            </div>
            <div className={styles.cardBody}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span className={styles.cardCta}>Personalizar ahora</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
