import type { NextConfig } from "next";

// Cabeceras de seguridad. La tienda usa portapapeles y "compartir" (siguen permitidos);
// no usa cámara, micrófono ni ubicación. HSTS ya lo añade Vercel.
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
