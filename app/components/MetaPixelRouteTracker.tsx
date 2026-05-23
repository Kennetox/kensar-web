"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fbqPageView, flushPendingEvents } from "@/app/lib/meta-pixel";

export default function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRouteRef = useRef<string | null>(null);
  const search = searchParams.toString();

  useEffect(() => {
    const routeKey = `${pathname || "/"}${search ? `?${search}` : ""}`;
    if (lastTrackedRouteRef.current === routeKey) return;

    flushPendingEvents();
    fbqPageView();
    lastTrackedRouteRef.current = routeKey;
  }, [pathname, search]);

  return null;
}
