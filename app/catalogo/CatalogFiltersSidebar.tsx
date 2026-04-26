"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WebCatalogFilterOption } from "@/app/lib/metrikCatalog";

type SortOption = "recommended" | "name_asc" | "name_desc" | "price_asc" | "price_desc";

type CatalogFiltersSidebarProps = {
  query: string;
  sort: SortOption;
  minPrice: number;
  maxPrice: number;
  availableMinPrice: number;
  availableMaxPrice: number;
  selectedBrands: string[];
  brands: WebCatalogFilterOption[];
};

const PRICE_STEP = 1000;
const INITIAL_BRAND_LIMIT = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPriceLabel(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactGuide(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}m`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
  }
  return String(Math.round(value));
}

export default function CatalogFiltersSidebar({
  query,
  sort,
  minPrice,
  maxPrice,
  availableMinPrice,
  availableMaxPrice,
  selectedBrands,
  brands,
}: CatalogFiltersSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeMin = useMemo(
    () => Math.max(0, Number.isFinite(availableMinPrice) ? Math.round(availableMinPrice) : 0),
    [availableMinPrice]
  );
  const safeMax = useMemo(
    () => Math.max(safeMin, Number.isFinite(availableMaxPrice) ? Math.round(availableMaxPrice) : safeMin),
    [availableMaxPrice, safeMin]
  );
  const [localQuery, setLocalQuery] = useState(query);
  const [localSort, setLocalSort] = useState<SortOption>(sort);
  const [localMinPrice, setLocalMinPrice] = useState<number>(
    clamp(Math.round(minPrice || safeMin), safeMin, safeMax)
  );
  const [localMaxPrice, setLocalMaxPrice] = useState<number>(
    clamp(Math.round(maxPrice || safeMax), safeMin, safeMax)
  );
  const [localBrands, setLocalBrands] = useState<string[]>(selectedBrands);
  const [showAllBrands, setShowAllBrands] = useState(false);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    setLocalSort(sort);
  }, [sort]);

  useEffect(() => {
    setLocalMinPrice(clamp(Math.round(minPrice || safeMin), safeMin, safeMax));
  }, [minPrice, safeMin, safeMax]);

  useEffect(() => {
    setLocalMaxPrice(clamp(Math.round(maxPrice || safeMax), safeMin, safeMax));
  }, [maxPrice, safeMin, safeMax]);

  useEffect(() => {
    setLocalBrands(selectedBrands);
  }, [selectedBrands]);

  useEffect(() => {
    setShowAllBrands(false);
  }, [brands]);

  const priceRange = Math.max(1, safeMax - safeMin);
  const minPercent = ((localMinPrice - safeMin) / priceRange) * 100;
  const maxPercent = ((localMaxPrice - safeMin) / priceRange) * 100;
  const priceGuides = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        return Math.round(safeMin + ratio * priceRange);
      }),
    [safeMin, priceRange]
  );

  const visibleBrands = useMemo(() => {
    if (showAllBrands || brands.length <= INITIAL_BRAND_LIMIT) return brands;
    const firstBatch = brands.slice(0, INITIAL_BRAND_LIMIT);
    const existingValues = new Set(firstBatch.map((item) => item.value));
    const selectedExtras = brands.filter(
      (item) => localBrands.includes(item.value) && !existingValues.has(item.value)
    );
    return [...firstBatch, ...selectedExtras];
  }, [brands, localBrands, showAllBrands]);

  function applyFilters(next: {
    query?: string;
    sort?: SortOption;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = next.query ?? localQuery;
    const nextSort = next.sort ?? localSort;
    const nextMin = next.minPrice ?? localMinPrice;
    const nextMax = next.maxPrice ?? localMaxPrice;
    const nextBrands = next.brands ?? localBrands;

    if (nextQuery.trim()) params.set("local_q", nextQuery.trim());
    else params.delete("local_q");

    if (!nextSort || nextSort === "recommended") params.delete("sort");
    else params.set("sort", nextSort);

    if (nextMin > safeMin) params.set("min_price", String(nextMin));
    else params.delete("min_price");

    if (nextMax < safeMax) params.set("max_price", String(nextMax));
    else params.delete("max_price");

    params.delete("brand");
    nextBrands.forEach((brand) => {
      if (brand) params.append("brand", brand);
    });

    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleBrandToggle(brandValue: string, checked: boolean) {
    const nextBrands = checked
      ? [...localBrands, brandValue]
      : localBrands.filter((item) => item !== brandValue);
    setLocalBrands(nextBrands);
    applyFilters({ brands: nextBrands });
  }

  return (
    <div className="catalog-filter-panel">
      <section className="catalog-filter-block">
        <p className="catalog-filter-label">Buscar</p>
        <div className="catalog-sidebar-search">
          <input
            type="search"
            value={localQuery}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setLocalQuery(nextQuery);
              applyFilters({ query: nextQuery });
            }}
            className="catalog-sidebar-search-input"
            placeholder="Buscar en esta sección..."
            aria-label="Buscar por nombre o referencia"
          />
        </div>
      </section>

      <section className="catalog-filter-block">
        <p className="catalog-filter-label">Precio</p>
        <div className="catalog-price-range-inputs">
          <input
            type="number"
            min={safeMin}
            max={safeMax}
            step={PRICE_STEP}
            value={localMinPrice}
            onChange={(event) => {
              const rawValue = Number(event.target.value || safeMin);
              const normalized = clamp(rawValue, safeMin, localMaxPrice);
              setLocalMinPrice(normalized);
            }}
            className="catalog-sidebar-search-input"
            aria-label="Precio mínimo"
          />
          <span className="catalog-price-separator">-</span>
          <input
            type="number"
            min={safeMin}
            max={safeMax}
            step={PRICE_STEP}
            value={localMaxPrice}
            onChange={(event) => {
              const rawValue = Number(event.target.value || safeMax);
              const normalized = clamp(rawValue, localMinPrice, safeMax);
              setLocalMaxPrice(normalized);
            }}
            className="catalog-sidebar-search-input"
            aria-label="Precio máximo"
          />
        </div>
        <div className="catalog-price-slider-shell">
          <div className="catalog-price-slider-track" aria-hidden="true" />
          <div
            className="catalog-price-slider-active"
            style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
            aria-hidden="true"
          />
          <div className="catalog-price-slider-wrap">
            <input
              type="range"
              min={safeMin}
              max={safeMax}
              step={PRICE_STEP}
              value={localMinPrice}
              onChange={(event) => {
                const normalized = clamp(Number(event.target.value || safeMin), safeMin, localMaxPrice);
                setLocalMinPrice(normalized);
              }}
              className="catalog-price-slider"
              aria-label="Control deslizante precio mínimo"
            />
            <input
              type="range"
              min={safeMin}
              max={safeMax}
              step={PRICE_STEP}
              value={localMaxPrice}
              onChange={(event) => {
                const normalized = clamp(Number(event.target.value || safeMax), localMinPrice, safeMax);
                setLocalMaxPrice(normalized);
              }}
              className="catalog-price-slider"
              aria-label="Control deslizante precio máximo"
            />
          </div>
          <div className="catalog-price-guides" aria-hidden="true">
            {priceGuides.map((value, index) => (
              <div key={`guide-${index}`} className="catalog-price-guide">
                <span className="catalog-price-guide-mark" />
                <small>{formatCompactGuide(value)}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="catalog-price-legend">
          <small>{formatPriceLabel(safeMin)}</small>
          <small>{formatPriceLabel(safeMax)}</small>
        </div>
        <button
          type="button"
          className="catalog-filter-apply-btn"
          onClick={() =>
            applyFilters({
              minPrice: localMinPrice,
              maxPrice: localMaxPrice,
            })
          }
        >
          Aplicar precio
        </button>
      </section>

      <section className="catalog-filter-block">
        <p className="catalog-filter-label">Ordenar por</p>
        <select
          value={localSort}
          onChange={(event) => {
            const nextSort = event.target.value as SortOption;
            setLocalSort(nextSort);
            applyFilters({ sort: nextSort });
          }}
          className="catalog-order-select"
        >
          <option value="recommended">Más relevantes</option>
          <option value="name_asc">Alfabéticamente, A-Z</option>
          <option value="name_desc">Alfabéticamente, Z-A</option>
          <option value="price_asc">Precio, menor a mayor</option>
          <option value="price_desc">Precio, mayor a menor</option>
        </select>
      </section>

      <section className="catalog-filter-block">
        <p className="catalog-filter-label">Marcas</p>
        <div className="catalog-brand-checklist">
          {visibleBrands.length ? (
            visibleBrands.map((item) => {
              const checked = localBrands.includes(item.value);
              return (
                <label key={item.value} className="catalog-brand-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => handleBrandToggle(item.value, event.target.checked)}
                  />
                  <span>{item.label}</span>
                  <small>{item.count}</small>
                </label>
              );
            })
          ) : (
            <p className="catalog-brand-empty">Sin marcas para este filtro.</p>
          )}
        </div>
        {!showAllBrands && brands.length > INITIAL_BRAND_LIMIT ? (
          <button
            type="button"
            className="catalog-brand-expand-btn"
            onClick={() => setShowAllBrands(true)}
          >
            Mostrar más
          </button>
        ) : null}
      </section>

      <button
        type="button"
        className="catalog-filter-clear-btn"
        onClick={() => {
          setLocalQuery("");
          setLocalSort("recommended");
          setLocalMinPrice(safeMin);
          setLocalMaxPrice(safeMax);
          setLocalBrands([]);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("local_q");
          params.delete("sort");
          params.delete("min_price");
          params.delete("max_price");
          params.delete("brand");
          params.delete("page");
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
      >
        Limpiar filtros
      </button>
    </div>
  );
}
