"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WebCatalogFilterOption } from "@/app/lib/metrikCatalog";

type SortOption = "recommended" | "name_asc" | "name_desc" | "price_asc" | "price_desc";

type CatalogFiltersSidebarProps = {
  sort: SortOption;
  minPrice: number;
  maxPrice: number;
  availableMaxPrice: number;
  selectedBrands: string[];
  brands: WebCatalogFilterOption[];
};

const PRICE_STEP = 1000;

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

export default function CatalogFiltersSidebar({
  sort,
  minPrice,
  maxPrice,
  availableMaxPrice,
  selectedBrands,
  brands,
}: CatalogFiltersSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeMax = useMemo(
    () => Math.max(0, Number.isFinite(availableMaxPrice) ? Math.round(availableMaxPrice) : 0),
    [availableMaxPrice]
  );
  const [localSort, setLocalSort] = useState<SortOption>(sort);
  const [localMinPrice, setLocalMinPrice] = useState<number>(clamp(Math.round(minPrice || 0), 0, safeMax || 0));
  const [localMaxPrice, setLocalMaxPrice] = useState<number>(
    clamp(Math.round(maxPrice || safeMax || 0), 0, safeMax || 0)
  );
  const [localBrands, setLocalBrands] = useState<string[]>(selectedBrands);

  useEffect(() => {
    setLocalSort(sort);
  }, [sort]);

  useEffect(() => {
    setLocalMinPrice(clamp(Math.round(minPrice || 0), 0, safeMax || 0));
  }, [minPrice, safeMax]);

  useEffect(() => {
    setLocalMaxPrice(clamp(Math.round(maxPrice || safeMax || 0), 0, safeMax || 0));
  }, [maxPrice, safeMax]);

  useEffect(() => {
    setLocalBrands(selectedBrands);
  }, [selectedBrands]);

  function applyFilters(next: {
    sort?: SortOption;
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextSort = next.sort ?? localSort;
    const nextMin = next.minPrice ?? localMinPrice;
    const nextMax = next.maxPrice ?? localMaxPrice;
    const nextBrands = next.brands ?? localBrands;

    if (!nextSort || nextSort === "recommended") params.delete("sort");
    else params.set("sort", nextSort);

    if (nextMin > 0) params.set("min_price", String(nextMin));
    else params.delete("min_price");

    if (nextMax > 0) params.set("max_price", String(nextMax));
    else params.delete("max_price");

    params.delete("brand");
    nextBrands.forEach((brand) => {
      if (brand) params.append("brand", brand);
    });

    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    router.refresh();
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
        <p className="catalog-filter-label">Precio</p>
        <div className="catalog-price-range-inputs">
          <input
            type="number"
            min={0}
            max={safeMax}
            step={PRICE_STEP}
            value={localMinPrice}
            onChange={(event) => {
              const rawValue = Number(event.target.value || 0);
              const normalized = clamp(rawValue, 0, localMaxPrice);
              setLocalMinPrice(normalized);
            }}
            className="catalog-sidebar-search-input"
            aria-label="Precio mínimo"
          />
          <span className="catalog-price-separator">-</span>
          <input
            type="number"
            min={0}
            max={safeMax}
            step={PRICE_STEP}
            value={localMaxPrice}
            onChange={(event) => {
              const rawValue = Number(event.target.value || 0);
              const normalized = clamp(rawValue, localMinPrice, safeMax);
              setLocalMaxPrice(normalized);
            }}
            className="catalog-sidebar-search-input"
            aria-label="Precio máximo"
          />
        </div>
        <div className="catalog-price-slider-wrap">
          <input
            type="range"
            min={0}
            max={safeMax}
            step={PRICE_STEP}
            value={localMinPrice}
            onChange={(event) => {
              const normalized = clamp(Number(event.target.value || 0), 0, localMaxPrice);
              setLocalMinPrice(normalized);
            }}
            className="catalog-price-slider"
            aria-label="Control deslizante precio mínimo"
          />
          <input
            type="range"
            min={0}
            max={safeMax}
            step={PRICE_STEP}
            value={localMaxPrice}
            onChange={(event) => {
              const normalized = clamp(Number(event.target.value || 0), localMinPrice, safeMax);
              setLocalMaxPrice(normalized);
            }}
            className="catalog-price-slider"
            aria-label="Control deslizante precio máximo"
          />
        </div>
        <div className="catalog-price-legend">
          <small>{formatPriceLabel(0)}</small>
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
          {brands.length ? (
            brands.map((item) => {
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
      </section>

      <button
        type="button"
        className="catalog-filter-clear-btn"
        onClick={() => {
          setLocalSort("recommended");
          setLocalMinPrice(0);
          setLocalMaxPrice(safeMax);
          setLocalBrands([]);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("sort");
          params.delete("min_price");
          params.delete("max_price");
          params.delete("brand");
          params.delete("page");
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
          router.refresh();
        }}
      >
        Limpiar filtros
      </button>
    </div>
  );
}
