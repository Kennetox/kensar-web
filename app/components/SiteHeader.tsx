import Image from "next/image";
import Link from "next/link";
import { navigation } from "@/app/components/siteData";
import { buildWhatsAppPrefill } from "@/app/lib/kora/whatsapp-handoff";

export default function SiteHeader() {
  const whatsappHref = buildWhatsAppPrefill({
    origin: "unknown",
    need: "contacto_general",
    intent: "general_contact",
    currentPath: "/",
    currentUrl: "https://kensarelectronic.com/",
    latestInput: "Hola, quiero asesoría comercial.",
  }).href;

  return (
    <header className="site-shell header-shell">
      <Link href="/" className="brand-lockup brand-lockup-link" aria-label="Ir al inicio de Kensar">
        <span className="brand-logo-wrap brand-logo-wrap-horizontal">
          <Image
            src="/branding/kensar-horizontal.png"
            alt="Logo Kensar Electronic"
            width={420}
            height={120}
            className="brand-logo brand-logo-horizontal"
            priority
          />
        </span>
      </Link>

      <nav className="main-nav" aria-label="Principal">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="nav-link">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <a href={whatsappHref} className="button button-primary">
          WhatsApp
        </a>
      </div>
    </header>
  );
}
