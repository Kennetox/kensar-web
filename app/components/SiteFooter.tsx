import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-shell footer-shell">
      <div>
        <p className="eyebrow">Kensar Electronic</p>
        <p className="footer-copy">
          Presencia corporativa preparada para crecer a catalogo conectado con Metrik.
        </p>
      </div>
      <div className="footer-links">
        <Link href="/empresa">Empresa</Link>
        <Link href="/servicios">Servicios</Link>
        <Link href="/contacto">Contacto</Link>
      </div>
      <div className="footer-meta">
        <p>Colombia</p>
        <p>WhatsApp y atencion comercial</p>
      </div>
    </footer>
  );
}
