import type { NextConfig } from "next";

// Cabeceras de seguridad. La tienda usa portapapeles y "compartir" (siguen permitidos);
// no usa cámara, micrófono ni ubicación. HSTS ya lo añade Vercel.
// CSP en modo "solo reportar": el navegador NO bloquea nada; envía al backend lo que
// habría bloqueado (POST /security/csp-report?site=tienda) para afinar la lista.
const API_ORIGIN = "https://api.metrikpos.com";
const cspReportOnly = [
  "default-src 'self'",
  // Next.js (en línea), Google Analytics, píxel de Meta y model-viewer (visor 3D).
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${API_ORIGIN} https://images.unsplash.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com`,
  `media-src 'self' blob: ${API_ORIGIN}`,
  "font-src 'self' data:",
  `connect-src 'self' ${API_ORIGIN} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net`,
  "frame-src 'self' https://maps.google.com https://www.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `report-uri ${API_ORIGIN}/security/csp-report?site=tienda`,
].join("; ");

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

// El panel de Metrik (Comercio Web) muestra el visor 3D de personalización dentro de un iframe.
// Solo ese visor admite marcos, y solo desde el panel (y su entorno local de desarrollo).
const VISOR_FRAME_ANCESTORS = [
  "'self'",
  "https://metrikpos.com",
  "https://www.metrikpos.com",
  "https://kensar-frontend-wyu3.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].join(" ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Todo excepto el visor: no se puede incrustar en ningún sitio.
        source: "/((?!personaliza/visor).*)",
        headers: [
          ...baseSecurityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/personaliza/visor/:path*",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: `frame-ancestors ${VISOR_FRAME_ANCESTORS}` },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "api.metrikpos.com",
      },
    ],
  },
};

export default nextConfig;
