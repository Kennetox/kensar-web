"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type HeaderSearchItem = {
  kind?: "product" | "combo";
  id: number;
  slug: string;
  name: string;
  price: number | null;
  compare_price: number | null;
  brand: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
};

function formatPrice(value: number | null) {
  if (value === null) return "Consultar precio";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HeaderCatalogSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const queryFromUrl = useMemo(() => searchParams.get("q") || "", [searchParams]);

  const [query, setQuery] = useState(queryFromUrl);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HeaderSearchItem[]>([]);

  useEffect(() => {
    setQuery(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const className = "search-focus-active";
    if (open && query.trim().length > 0) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => {
      document.body.classList.remove(className);
    };
  }, [open, query]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      requestIdRef.current += 1;
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setItems([]);
          return;
        }
        const data = (await response.json()) as { items?: HeaderSearchItem[] };
        if (requestId === requestIdRef.current) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (requestId === requestIdRef.current && !controller.signal.aborted) {
          setItems([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  function buildCatalogSearchHref(term: string): string {
    const clean = term.trim();
    return clean ? `/catalogo?q=${encodeURIComponent(clean)}` : "/catalogo";
  }

  function buildCombosSearchHref(term: string): string {
    const clean = term.trim();
    return clean ? `/combos?q=${encodeURIComponent(clean)}` : "/combos";
  }

  function goToCatalogSearch(term: string) {
    const onlyComboMatches = items.length > 0 && items.every((item) => item.kind === "combo");
    const href = onlyComboMatches ? buildCombosSearchHref(term) : buildCatalogSearchHref(term);
    setOpen(false);
    if (pathname === "/catalogo") {
      router.replace(href);
      return;
    }
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToCatalogSearch(query);
  }

  return (
    <div className="header-search-live" ref={rootRef}>
      <form onSubmit={handleSubmit} className="header-search-form" role="search" aria-label="Buscar en catalogo">
        <input
          type="search"
          name="q"
          value={query}
          placeholder="Que producto buscas?"
          className="header-search-input"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
        />
        <button type="submit" className="header-search-btn">
          Buscar
        </button>
      </form>

      {open && query.trim().length >= 2 ? (
        <div className="header-search-results" role="listbox" aria-label="Resultados de busqueda">
          {loading ? <p className="header-search-status">Buscando...</p> : null}
          {!loading && !items.length ? (
            <p className="header-search-status">Sin resultados para {query.trim()}.</p>
          ) : null}
          {!loading && items.length
            ? items.map((item) => (
                <Link
                  key={`${item.kind || "product"}-${item.id}`}
                  href={item.kind === "combo" ? `/combos/${item.slug}` : `/catalogo/${item.slug}`}
                  className="header-search-item"
                  onClick={() => {
                    setQuery("");
                    setItems([]);
                    setOpen(false);
                  }}
                >
                  <div
                    className="header-search-item-image"
                    style={{
                      backgroundImage: item.image_thumb_url || item.image_url ? `url('${item.image_thumb_url || item.image_url}')` : "url('/branding/icono-white.svg'), linear-gradient(135deg, #d9e4f3 0%, #c9d8ee 100%)",
                      backgroundSize: item.image_thumb_url || item.image_url ? "contain" : "50%, cover",
                      backgroundPosition: "center center, center center",
                      backgroundRepeat: "no-repeat, no-repeat",
                    }}
                    aria-hidden="true"
                  />
                  <div className="header-search-item-copy">
                    <small>{item.kind === "combo" ? "Combo" : "Producto"}</small>
                    <strong>{item.name}</strong>
                    <p>
                      {formatPrice(item.price)}
                      {typeof item.compare_price === "number" && item.compare_price > (item.price || 0) ? (
                        <span>{formatPrice(item.compare_price)}</span>
                      ) : null}
                    </p>
                    {item.brand ? <small>{item.brand}</small> : null}
                  </div>
                </Link>
              ))
            : null}
          {!loading ? (
            <button
              type="button"
              className="header-search-view-all"
              onClick={() => goToCatalogSearch(query)}
            >
              Mostrar todos los resultados de &quot;{query.trim()}&quot;
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
