"use client";

import { useEffect, useState } from "react";

const OPEN_CLASS = "mobile-search-open";

export default function MobileSearchToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle(OPEN_CLASS, open);
    return () => {
      document.body.classList.remove(OPEN_CLASS);
    };
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const handleChange = () => {
      if (!media.matches) setOpen(false);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <button
      type="button"
      className={`mobile-search-toggle${open ? " is-open" : ""}`}
      onClick={() => setOpen((current) => !current)}
      aria-label={open ? "Ocultar búsqueda" : "Mostrar búsqueda"}
      aria-expanded={open}
      aria-controls="header-search-cluster"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m21 21-4.35-4.35" />
        <circle cx="11" cy="11" r="6.75" />
      </svg>
    </button>
  );
}

