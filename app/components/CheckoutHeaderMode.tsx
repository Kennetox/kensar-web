"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHECKOUT_HEADER_CLASS = "checkout-header-mode";

export default function CheckoutHeaderMode() {
  const pathname = usePathname();

  useEffect(() => {
    const isCheckoutPage = pathname === "/pago" || pathname.startsWith("/pago/");
    document.body.classList.toggle(CHECKOUT_HEADER_CLASS, isCheckoutPage);

    return () => {
      document.body.classList.remove(CHECKOUT_HEADER_CLASS);
    };
  }, [pathname]);

  return null;
}
