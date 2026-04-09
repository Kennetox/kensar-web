"use client";

export default function GlobalBackToTop() {
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className="global-back-to-top-strip"
      onClick={handleBackToTop}
      aria-label="Volver al inicio"
    >
      <span className="global-back-to-top-label">Volver al inicio</span>
    </button>
  );
}
