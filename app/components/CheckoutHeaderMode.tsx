"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHECKOUT_HEADER_CLASS = "checkout-header-mode";
const CHECKOUT_PAYMENT_CLASS = "checkout-payment-page";
const PERSONALIZA_VISOR_EMBED_CLASS = "personaliza-visor-embed-page";
const PERSONALIZA_EDITOR_CLASS = "personaliza-editor-page";

export default function CheckoutHeaderMode() {
  const pathname = usePathname();

  useEffect(() => {
    const isCheckoutPage = pathname === "/pago" || pathname.startsWith("/pago/");
    const isLegalPage = pathname === "/legal" || pathname.startsWith("/legal/");
    const isPersonalizaVisorPage = pathname === "/personaliza/visor" || pathname.startsWith("/personaliza/visor/");
    const isPersonalizaEditorPage = pathname === "/personaliza";
    const useMinimalHeader = isCheckoutPage || isLegalPage;
    const hideFooterAndFloating = isCheckoutPage || isLegalPage;

    document.body.classList.toggle(CHECKOUT_HEADER_CLASS, useMinimalHeader);
    document.body.classList.toggle(CHECKOUT_PAYMENT_CLASS, hideFooterAndFloating);
    document.body.classList.toggle(PERSONALIZA_VISOR_EMBED_CLASS, isPersonalizaVisorPage);
    document.body.classList.toggle(PERSONALIZA_EDITOR_CLASS, isPersonalizaEditorPage);

    return () => {
      document.body.classList.remove(CHECKOUT_HEADER_CLASS);
      document.body.classList.remove(CHECKOUT_PAYMENT_CLASS);
      document.body.classList.remove(PERSONALIZA_VISOR_EMBED_CLASS);
      document.body.classList.remove(PERSONALIZA_EDITOR_CLASS);
    };
  }, [pathname]);

  return null;
}
