import Link from "next/link";
import Image from "next/image";
import styles from "./HomePersonalizaHighlight.module.css";
import { PERSONALIZABLE_PRODUCTS } from "@/app/personaliza/_config/presets";

const PERSONALIZABLE_FAMILIES = PERSONALIZABLE_PRODUCTS.map((item) => ({
  ...item,
  description:
    item.id === "maraca" ? "Disponible pronto en el editor." : item.description,
  isComingSoon: item.id === "maraca",
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
        {PERSONALIZABLE_FAMILIES.map((item) => (
          <Link key={item.id} href="/personaliza" className={styles.card}>
            <div className={styles.media}>
              <Image
                src={item.cardImage}
                alt={item.name}
                fill
                sizes="(max-width: 900px) 100vw, 33vw"
                className={styles.mediaImage}
              />
              {item.isComingSoon ? (
                <span className={styles.soonBadge}>Próximamente</span>
              ) : null}
            </div>
            <div className={styles.cardBody}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
