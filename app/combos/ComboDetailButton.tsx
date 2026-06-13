"use client";

import { useRouter } from "next/navigation";

export default function ComboDetailButton({
  href,
  label,
}: {
  href: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <div className="catalog-product-card-cta-wrap">
      <button
        type="button"
        onClick={() => router.push(href)}
        className="catalog-cart-action catalog-product-card-cta-button"
      >
        {label || "Añadir al carrito"}
      </button>
    </div>
  );
}
