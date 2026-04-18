"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ProductBackToCatalogLinkProps = {
  className?: string;
  fallbackHref?: string;
  children?: ReactNode;
};

export default function ProductBackToCatalogLink({
  className,
  fallbackHref = "/",
  children = "← Volver al catálogo",
}: ProductBackToCatalogLinkProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToParam = (searchParams.get("returnTo") || "").trim();
  const safeReturnTo =
    returnToParam.startsWith("/") && !returnToParam.startsWith("//") ? returnToParam : "";
  const effectiveFallbackHref = safeReturnTo || fallbackHref;

  const combinedClassName = ["catalog-breadcrumb-back-link", className].filter(Boolean).join(" ");

  return (
    <a
      href={effectiveFallbackHref}
      className={combinedClassName}
      onClick={(event) => {
        event.preventDefault();

        if (safeReturnTo) {
          router.push(safeReturnTo);
          return;
        }

        if (typeof window !== "undefined" && fallbackHref === "/") {
          const currentOrigin = window.location.origin;
          const referrer = document.referrer || "";
          const cameFromCatalog = referrer.startsWith(`${currentOrigin}/catalogo`);
          if (cameFromCatalog && window.history.length > 1) {
            router.back();
            return;
          }
        }

        router.push(fallbackHref);
      }}
    >
      {children}
    </a>
  );
}
