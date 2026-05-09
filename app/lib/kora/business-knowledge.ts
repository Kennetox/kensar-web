export type KoraBusinessKnowledge = {
  business_name: string;
  city: string;
  address: string;
  whatsapp: string;
  email: string;
  schedules: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  support: {
    technical_support: string;
    repair_services: string;
  };
  maps_url: string;
  policies: {
    returns: string;
    shipping: string;
    warranty: string;
  };
  key_pages: {
    contact: string;
    catalog: string;
    payments: string;
    orders: string;
  };
  main_categories: Array<{ label: string; path: string }>;
};

export function getKoraBusinessKnowledge(): KoraBusinessKnowledge {
  const whatsapp = process.env.NEXT_PUBLIC_KENSAR_WHATSAPP || "573185657508";
  return {
    business_name: process.env.NEXT_PUBLIC_KENSAR_BUSINESS_NAME || "Kensar Electronic",
    city: process.env.NEXT_PUBLIC_KENSAR_CITY || "Palmira, Valle del Cauca",
    address: process.env.NEXT_PUBLIC_KENSAR_ADDRESS || "Cra 24 #30-75",
    whatsapp,
    email: process.env.NEXT_PUBLIC_KENSAR_EMAIL || "soporte@kensar.com",
    schedules: {
      weekdays: process.env.NEXT_PUBLIC_KENSAR_HOURS_WEEKDAYS || "Lunes a viernes: 8:30 a.m. - 6:00 p.m.",
      saturday: process.env.NEXT_PUBLIC_KENSAR_HOURS_SATURDAY || "Sábados: 8:30 a.m. - 2:00 p.m.",
      sunday: process.env.NEXT_PUBLIC_KENSAR_HOURS_SUNDAY || "Domingos: confirmar disponibilidad por WhatsApp.",
    },
    support: {
      technical_support:
        process.env.NEXT_PUBLIC_KENSAR_SUPPORT_TECHNICAL ||
        "Sí, contamos con soporte técnico y acompañamiento postventa.",
      repair_services:
        process.env.NEXT_PUBLIC_KENSAR_SUPPORT_REPAIRS ||
        "Para revisión o reparación, validamos el caso según el equipo y su garantía.",
    },
    maps_url:
      process.env.NEXT_PUBLIC_KENSAR_MAPS_URL ||
      "https://www.google.com/maps/search/?api=1&query=Cra+24+%2330-75+Palmira+Valle+del+Cauca",
    policies: {
      returns: "/legal/cambios-devoluciones-garantias",
      shipping: "/legal/politica-envios",
      warranty: "/legal/cambios-devoluciones-garantias",
    },
    key_pages: {
      contact: "/contacto",
      catalog: "/catalogo",
      payments: "/pago",
      orders: "/mis-pedidos",
    },
    main_categories: [
      { label: "Cabinas y sonido", path: "/catalogo/categoria/audio-profesional" },
      { label: "Instrumentos musicales", path: "/catalogo/categoria/instrumentos" },
      { label: "Cámaras de seguridad", path: "/catalogo/categoria/camaras" },
      { label: "Accesorios y cables", path: "/catalogo/categoria/accesorios" },
    ],
  };
}
