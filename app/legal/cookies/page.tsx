import Link from "next/link";

export default function CookiesPolicyPage() {
  return (
    <section className="legal-page-shell">
      <Link href="/" className="legal-page-back-link">
        ← Volver al inicio
      </Link>
      <article className="legal-page-card">
        <p className="legal-page-kicker">Legal Kensar</p>
        <h1>Política de cookies</h1>
        <p>
          Esta política explica cómo Kensar Electronic utiliza cookies y tecnologías similares para garantizar el
          funcionamiento del sitio, analizar uso y mejorar la experiencia de compra.
        </p>

        <h2>1. ¿Qué son las cookies?</h2>
        <p>
          Son pequeños archivos que se almacenan en tu navegador cuando visitas un sitio web. Permiten recordar
          preferencias, mantener sesiones y recopilar métricas de navegación.
        </p>

        <h2>2. Tipos de cookies que usamos</h2>
        <p>
          <strong>Esenciales:</strong> necesarias para funciones básicas del sitio (carrito, sesión y seguridad).
        </p>
        <p>
          <strong>Analítica:</strong> ayudan a comprender tráfico, páginas más visitadas y rendimiento.
        </p>
        <p>
          <strong>Marketing:</strong> permiten medir campañas y personalizar comunicación comercial.
        </p>

        <h2>3. Gestión del consentimiento</h2>
        <p>
          Puedes aceptar todas las cookies, rechazar las opcionales o configurar preferencias desde el banner de
          cookies cuando visitas el sitio.
        </p>

        <h2>4. Control desde el navegador</h2>
        <p>
          También puedes eliminar o bloquear cookies directamente desde la configuración de tu navegador. Ten en cuenta
          que bloquear cookies esenciales puede afectar funcionalidades del sitio.
        </p>

        <h2>5. Cambios a esta política</h2>
        <p>
          Kensar Electronic puede actualizar esta política para reflejar cambios normativos o técnicos. La versión
          vigente será la publicada en esta página.
        </p>

        <p className="legal-page-note">
          Consulta también nuestra <Link href="/legal/privacidad">Política de privacidad</Link> y{" "}
          <Link href="/legal/tratamiento-datos">Política de tratamiento de datos</Link>.
        </p>
      </article>
    </section>
  );
}
