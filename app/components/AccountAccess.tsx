"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

export default function AccountAccess() {
  const { authenticated, customer, loading } = useWebCustomer();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (authenticated && !loading) {
    return null;
  }

  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;
  const href = `/cuenta?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Link
      href={href}
      className="header-icon-link header-account-link"
      aria-label={authenticated ? `Entrar a la cuenta de ${customer?.name}` : "Entrar a mi cuenta"}
    >
      <span className="header-account-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" />
          <path d="M4.5 20.4c.6-3.6 3.6-6.2 7.5-6.2s6.9 2.6 7.5 6.2" />
        </svg>
      </span>
    </Link>
  );
}
