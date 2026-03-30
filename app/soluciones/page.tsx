import { solutionGroups } from "@/app/components/siteData";

export default function SolucionesPage() {
  return (
    <main className="site-shell internal-page section-space">
      <div className="page-hero">
        <p className="section-label">Soluciones</p>
        <h1 className="page-title">La oferta se organiza por necesidad del cliente y no solo por inventario.</h1>
        <p className="section-intro">
          Esta pagina sirve para agrupar lineas comerciales y dirigir rapidamente hacia productos, servicios o contacto.
        </p>
      </div>
      <section className="pill-grid page-pill-grid">
        {solutionGroups.map((group) => (
          <article key={group} className="solution-card">
            <h2>{group}</h2>
            <p>Espacio preparado para una descripcion corta, imagen propia y CTA especifica por solucion.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
