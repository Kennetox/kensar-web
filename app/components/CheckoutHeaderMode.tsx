"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHECKOUT_HEADER_CLASS = "checkout-header-mode";
const CHECKOUT_PAYMENT_CLASS = "checkout-payment-page";

export default function CheckoutHeaderMode() {
  const pathname = usePathname();

  useEffect(() => {
    const isCheckoutPage = pathname === "/pago" || pathname.startsWith("/pago/");
    const isCheckoutPaymentPage = pathname === "/pago" || pathname.startsWith("/pago/");
    document.body.classList.toggle(CHECKOUT_HEADER_CLASS, isCheckoutPage);
    document.body.classList.toggle(CHECKOUT_PAYMENT_CLASS, isCheckoutPaymentPage);

    return () => {
      document.body.classList.remove(CHECKOUT_HEADER_CLASS);
      document.body.classList.remove(CHECKOUT_PAYMENT_CLASS);
    };
  }, [pathname]);

  return null;
}
