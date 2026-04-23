"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHECKOUT_HEADER_CLASS = "checkout-header-mode";
const CHECKOUT_PAYMENT_CLASS = "checkout-payment-page";
const PERSONALIZA_VISOR_EMBED_CLASS = "personaliza-visor-embed-page";

export default function CheckoutHeaderMode() {
  const pathname = usePathname();

  useEffect(() => {
    const isCheckoutPage = pathname === "/pago" || pathname.startsWith("/pago/");
    const isLegalPage = pathname === "/legal" || pathname.startsWith("/legal/");
    const isPersonalizaVisorPage = pathname === "/personaliza/visor" || pathname.startsWith("/personaliza/visor/");
    const useMinimalHeader = isCheckoutPage || isLegalPage;
    const hideFooterAndFloating = isCheckoutPage || isLegalPage;

    document.body.classList.toggle(CHECKOUT_HEADER_CLASS, useMinimalHeader);
    document.body.classList.toggle(CHECKOUT_PAYMENT_CLASS, hideFooterAndFloating);
    document.body.classList.toggle(PERSONALIZA_VISOR_EMBED_CLASS, isPersonalizaVisorPage);

    return () => {
      document.body.classList.remove(CHECKOUT_HEADER_CLASS);
      document.body.classList.remove(CHECKOUT_PAYMENT_CLASS);
      document.body.classList.remove(PERSONALIZA_VISOR_EMBED_CLASS);
    };
  }, [pathname]);

  return null;
}
