"use client";

import { Suspense } from "react";
import Script from "next/script";
import GoogleAnalyticsRouteTracker from "@/app/components/GoogleAnalyticsRouteTracker";
import { GA_MEASUREMENT_ID, isGaConfigured } from "@/app/lib/ga4";

export default function GoogleAnalytics() {
  if (!isGaConfigured()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-base" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <GoogleAnalyticsRouteTracker />
      </Suspense>
    </>
  );
}
