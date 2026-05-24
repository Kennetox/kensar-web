"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { gtagPageView, isGaConfigured } from "@/app/lib/ga4";

export default function GoogleAnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRouteRef = useRef<string | null>(null);
  const search = searchParams.toString();

  useEffect(() => {
    if (!isGaConfigured()) return;

    const routeKey = `${pathname || "/"}${search ? `?${search}` : ""}`;
    if (lastTrackedRouteRef.current === routeKey) return;

    gtagPageView(routeKey);
    lastTrackedRouteRef.current = routeKey;
  }, [pathname, search]);

  return null;
}
