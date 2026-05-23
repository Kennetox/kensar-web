"use client";

import { Suspense } from "react";
import Script from "next/script";
import MetaPixelRouteTracker from "@/app/components/MetaPixelRouteTracker";
import { flushPendingEvents } from "@/app/lib/meta-pixel";

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive" onLoad={flushPendingEvents}>
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
        `}
      </Script>
      <Suspense fallback={null}>
        <MetaPixelRouteTracker />
      </Suspense>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
