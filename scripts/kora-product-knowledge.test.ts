import assert from "node:assert/strict";
import test from "node:test";

import { buildProductKnowledgeProfile, isKnowledgeSafeForRecommendation } from "../app/lib/kora/product-knowledge";

test("builds a traceable main guitar profile", () => {
  const profile = buildProductKnowledgeProfile({
    id: 1,
    name: "Guitarra Yamaha C40 Acústica Clásica",
    category_path: "guitarras",
    long_description: "Guitarra con cuerdas de nylon para aprendizaje.",
  });
  assert.equal(profile.schema_version, "kora-product-knowledge-v2");
  assert.equal(profile.classification.family.value, "guitarras");
  assert.equal(profile.classification.role.value, "main_product");
  assert.match(profile.classification.subtype?.value || "", /acustica/);
  assert.equal(profile.materials.some((item) => item.value === "nylon"), true);
  assert.equal(isKnowledgeSafeForRecommendation(profile, ["guitarras"]), true);
});

test("classifies strings as an accessory instead of a guitar", () => {
  const profile = buildProductKnowledgeProfile({
    name: "Encordado x6 para Guitarra Clásica Orphee",
    category_path: "guitarras",
  });
  assert.equal(profile.classification.family.value, "guitarras");
  assert.equal(profile.classification.role.value, "accessory");
  assert.equal(isKnowledgeSafeForRecommendation(profile, ["guitarras"]), false);
});

test("adds verified requirements to passive cabinets", () => {
  const profile = buildProductKnowledgeProfile({ name: "Cabina 15 Pasiva Pro DJ", category_path: "cabinas" });
  assert.equal(profile.requirements.some((item) => item.value === "amplificador_externo"), true);
});

test("detects contradictory guitar subtype data", () => {
  const profile = buildProductKnowledgeProfile({
    name: "Guitarra Eléctrica Modelo X",
    category_path: "guitarras",
    long_description: "Guitarra acústica clásica para aprendizaje",
  });
  assert.equal(profile.review_flags.includes("contradictory_subtype"), true);
  assert.equal(isKnowledgeSafeForRecommendation(profile, ["guitarras"]), false);
});

test("extracts camera features with evidence sources", () => {
  const profile = buildProductKnowledgeProfile({
    name: "Cámara de Seguridad WiFi",
    category_path: "camaras-de-seguridad",
    long_description: "Incluye visión nocturna y almacenamiento microSD.",
  });
  assert.equal(profile.classification.family.value, "seguridad");
  assert.equal(profile.features.some((item) => item.value === "wifi" && item.source === "catalog_name"), true);
  assert.equal(profile.features.some((item) => item.value === "vision_nocturna" && item.source === "catalog_description"), true);
});

test("leaves unknown materials unresolved instead of inventing them", () => {
  const profile = buildProductKnowledgeProfile({ name: "Micrófono Inalámbrico Doble", category_path: "microfonos" });
  assert.equal(profile.materials.length, 0);
  assert.equal(profile.unresolved_fields.includes("materials"), true);
});

test("does not classify string instruments as accessories because of their category", () => {
  const profile = buildProductKnowledgeProfile({
    name: "Bajo Eléctrico 4C Ayson",
    category_path: "instrumentos-de-cuerda",
  });
  assert.equal(profile.classification.role.value, "main_product");
  assert.equal(profile.review_flags.includes("family_identity_conflict"), false);
});

test("flags video-call cameras placed in security category", () => {
  const profile = buildProductKnowledgeProfile({
    name: "Cámara de Videollamadas Model YH-XM",
    category_path: "camaras-de-seguridad",
  });
  assert.equal(profile.review_flags.includes("family_identity_conflict"), true);
  assert.equal(isKnowledgeSafeForRecommendation(profile, ["seguridad"]), false);
});

test("classifies tripods and microSD cards as accessories", () => {
  assert.equal(
    buildProductKnowledgeProfile({ name: "Trípode Spain Para Cabina", category_path: "tripodes" }).classification.role.value,
    "accessory"
  );
  assert.equal(
    buildProductKnowledgeProfile({ name: "Micro SD 32GB", category_path: "camaras-de-seguridad" }).classification.role.value,
    "accessory"
  );
});

test("classifies every newly covered catalog family", () => {
  const cases = [
    ["Amplificador American Sound AK-616UB", "amplificadores", "amplificadores"],
    ["Consola Yamaha MG10XU", "consolas", "consolas"],
    ["Interfaz de Audio Behringer UMC22", "produccion-de-audio", "interfaces_audio"],
    ["Ukelele Concierto Zebra", "instrumentos-de-cuerda", "instrumentos_cuerda"],
    ["Megáfono Marketpeak MP-19", "megafonos", "megafonos"],
    ["Bongo x2", "percusion", "percusion"],
    ["Ecualizador Crossover Spain 234XL", "consolas", "procesamiento_audio"],
  ] as const;

  for (const [name, category_path, family] of cases) {
    const profile = buildProductKnowledgeProfile({ name, category_path });
    assert.equal(profile.classification.family.value, family, name);
    assert.equal(profile.classification.role.value, "main_product", name);
    assert.notEqual(profile.classification.subtype, null, name);
  }
});

test("adds commercial requirements without inventing product specifications", () => {
  const bass = buildProductKnowledgeProfile({ name: "Bajo Eléctrico 4C Ayson", category_path: "instrumentos-de-cuerda" });
  assert.equal(bass.requirements.some((item) => item.value === "amplificacion_para_sonar_externamente"), true);
  assert.equal(bass.complements.some((item) => item.value === "cable_de_instrumento"), true);

  const amplifier = buildProductKnowledgeProfile({ name: "Planta Spain SP4000", category_path: "amplificadores" });
  assert.equal(amplifier.requirements.some((item) => item.value === "potencia_e_impedancia_compatibles"), true);
  assert.equal(amplifier.materials.length, 0);
  assert.equal(amplifier.unresolved_fields.includes("materials"), true);
});

test("prioritizes product identity over a broad catalog category", () => {
  const profile = buildProductKnowledgeProfile({
    name: "Ecualizador Crossover Spain 234XL",
    category_path: "consolas",
  });
  assert.equal(profile.classification.family.value, "procesamiento_audio");
  assert.equal(profile.classification.subtype?.value, "crossover+ecualizador");
});

test("extracts explicit subtypes from imperfect production names", () => {
  const microphone = buildProductKnowledgeProfile({
    name: "Microfono Inalamabrico Doble Shure SH-6000",
    category_path: "microfonos",
  });
  assert.equal(microphone.classification.subtype?.value, "inalambrico");

  const camera = buildProductKnowledgeProfile({
    name: "Camara HikVision Turbo HD Bala DS-2CE16D0T-IRPF",
    category_path: "camaras-de-seguridad",
  });
  assert.equal(camera.classification.subtype?.value, "bala+turbo_hd");

  const array = buildProductKnowledgeProfile({
    name: "Bajo + Torre Spain 12A Linea ARRAY",
    category_path: "cabinas-activas",
  });
  assert.equal(array.classification.subtype?.value, "activa+line_array");
});

test("applies approved manufacturer knowledge by SKU with traceability", () => {
  const profile = buildProductKnowledgeProfile({
    id: 1128,
    sku: "1128",
    slug: "jbl-flip-6",
    name: "JBL Flip 6",
    category_path: "cabinas",
  });
  assert.equal(profile.classification.subtype?.value, "parlante_portatil_bluetooth");
  assert.equal(profile.classification.subtype?.source, "manufacturer_documentation");
  assert.equal(profile.features.some((item) => item.value === "proteccion_ip67"), true);
  assert.equal(profile.limitations.some((item) => item.value === "autonomia_depende_del_volumen_y_contenido"), true);
  assert.equal(profile.enrichment?.record_id, "manufacturer-jbl-flip-6-2026-08");
  assert.equal(profile.unresolved_fields.includes("subtype"), false);
});

test("applies reviewed Tapo C500 compatibility and limitations", () => {
  const profile = buildProductKnowledgeProfile({
    id: 865,
    sku: "865",
    slug: "camara-de-seguridad-tapo-tp-link-tapo-c500",
    name: "Camara de Seguridad Tapo Tp-Link Tapo C500",
    category_path: "camaras-de-seguridad",
  });
  assert.equal(profile.classification.subtype?.value, "wifi_exterior_pan_tilt");
  assert.equal(profile.features.some((item) => item.value === "audio_bidireccional"), true);
  assert.equal(profile.requirements.some((item) => item.value === "wifi_2_4_ghz_y_alimentacion_dc"), true);
  assert.equal(profile.limitations.some((item) => item.value === "tarjeta_micro_sd_se_vende_por_separado"), true);
});
