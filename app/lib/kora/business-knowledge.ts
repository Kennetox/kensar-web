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
  customer_guidance: {
    payments: {
      mercado_pago: string[];
      wompi: string[];
    };
    shipping: {
      coverage: string;
      free_shipping: string;
      palmira_time: string;
      cali_time: string;
      national_time: string;
      cost_factors: string[];
    };
    warranty: {
      coverage: string;
      exclusions: string[];
      claim_requirements: string[];
      timing: string;
    };
    returns: {
      conditions: string[];
      request_requirements: string[];
    };
  };
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
    customer_guidance: {
      payments: {
        mercado_pago: ["PSE", "Efecty", "billetera Mercado Pago"],
        wompi: ["Nequi", "PSE"],
      },
      shipping: {
        coverage: "Palmira, Cali y otras ciudades de Colombia mediante transportadoras nacionales.",
        free_shipping: "Envío gratis desde $100.000 COP para Palmira y Cali.",
        palmira_time: "El mismo día o el siguiente día hábil, según disponibilidad operativa.",
        cali_time: "Entre 1 y 2 días hábiles.",
        national_time: "Entre 2 y 5 días hábiles aproximadamente, según transportadora y destino.",
        cost_factors: ["ciudad y zona", "tamaño, peso o volumen", "cobertura logística"],
      },
      warranty: {
        coverage: "Aplica según las políticas del fabricante y la normativa vigente, después de una revisión técnica.",
        exclusions: ["mal uso", "intervención no autorizada", "daño físico"],
        claim_requirements: ["número de pedido o evidencia de compra", "motivo de la solicitud", "soporte fotográfico cuando aplique"],
        timing: "El diagnóstico y la respuesta dependen del producto, los repuestos y los lineamientos de la marca.",
      },
      returns: {
        conditions: ["estado del producto", "tiempo transcurrido desde la compra", "evidencia de compra", "conservación de accesorios y condiciones de entrega"],
        request_requirements: ["número de pedido", "motivo", "soporte fotográfico cuando aplique"],
      },
    },
  };
}
