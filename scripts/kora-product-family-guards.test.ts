import assert from "node:assert/strict";
import test from "node:test";

import { productMatchesExplicitConstraints, productMatchesFamily } from "../app/lib/kora/product-family-guards";

test("keeps main guitars and rejects guitar accessories", () => {
  assert.equal(productMatchesFamily({ name: "Guitarra Yamaha C40 Acústica", category_path: "guitarras" }, "guitarras"), true);
  assert.equal(productMatchesFamily({ name: "Guitarra Yamaha C40 Acústica", category_path: "instrumentos-de-cuerda" }, "guitarras"), true);
  assert.equal(productMatchesFamily({ name: "Encordado para Guitarra Clásica x6", category_path: "guitarras" }, "guitarras"), false);
});

test("keeps microphones and rejects microphone stands", () => {
  assert.equal(productMatchesFamily({ name: "Micrófono Inalámbrico Doble Pro DJ", category_path: "microfonos" }, "microfonos"), true);
  assert.equal(productMatchesFamily({ name: "Piaña de Micrófono Pro DJ SM-20", category_path: "microfonos" }, "microfonos"), false);
});

test("does not treat unrelated home products as televisions", () => {
  assert.equal(productMatchesFamily({ name: 'Televisor 32" NIA 4K LED', category_path: "televisores" }, "televisores"), true);
  assert.equal(productMatchesFamily({ name: "Adaptador de Corriente para Piano", category_path: "hogar-y-entretenimiento" }, "televisores"), false);
});

test("distinguishes HDMI from network cables", () => {
  assert.equal(productMatchesFamily({ name: "Cable HDMI 2.0 3M", category_path: "cables-hdmi" }, "hdmi"), true);
  assert.equal(productMatchesFamily({ name: "Cable de red CAT 6 Jaltech 5M", category_path: "cables-de-red" }, "hdmi"), false);
});

test("rejects video-call cameras from security recommendations", () => {
  assert.equal(productMatchesFamily({ name: "Cámara de Seguridad WiFi EZVIZ", category_path: "camaras-de-seguridad" }, "seguridad"), true);
  assert.equal(productMatchesFamily({ name: "Cámara de Videollamadas", category_path: "tecnologia" }, "seguridad"), false);
});

test("respects explicit guitar subtype", () => {
  assert.equal(
    productMatchesExplicitConstraints({ name: "Guitarra Eléctrica Pacifica" }, "guitarra electrica para rock", ["guitarras"]),
    true
  );
  assert.equal(
    productMatchesExplicitConstraints({ name: "Guitarra Acústica Yamaha C40" }, "guitarra electrica para rock", ["guitarras"]),
    false
  );
});

test("respects wireless microphone constraint", () => {
  assert.equal(
    productMatchesExplicitConstraints({ name: "Micrófono Inalámbrico Doble" }, "microfono inalambrico para karaoke", ["microfonos"]),
    true
  );
  assert.equal(
    productMatchesExplicitConstraints({ name: "Micrófono Condensador BM-800" }, "microfono inalambrico para karaoke", ["microfonos"]),
    false
  );
});

test("respects active and passive cabinet constraints", () => {
  assert.equal(productMatchesExplicitConstraints({ name: "Cabina 15 Activa" }, "cabina activa", ["cabinas"]), true);
  assert.equal(productMatchesExplicitConstraints({ name: "Cabina 15 Pasiva" }, "cabina activa", ["cabinas"]), false);
});

test("keeps compact cabinets and rejects clearly oversized cabinets", () => {
  const compact = { name: "Cabina 8\" Activa Recargable", category_path: "cabinas-activas" };
  const large = { name: "Cabina 15\" Activa 3000 watts", category_path: "cabinas-activas" };

  assert.equal(productMatchesExplicitConstraints(compact, "quiero una cabina pequeña y compacta", ["cabinas"]), true);
  assert.equal(productMatchesExplicitConstraints(large, "quiero una cabina pequeña y compacta", ["cabinas"]), false);
});

test("recognizes the newly covered main product families", () => {
  const cases = [
    [{ name: "Amplificador American Sound AK-616UB", category_path: "amplificadores" }, "amplificadores"],
    [{ name: "Consola Yamaha MG10XU", category_path: "consolas" }, "consolas"],
    [{ name: "Interfaz de Audio Behringer UMC22", category_path: "produccion-de-audio" }, "interfaces_audio"],
    [{ name: "Ukelele Concierto Zebra", category_path: "instrumentos-de-cuerda" }, "instrumentos_cuerda"],
    [{ name: "Megáfono Marketpeak MP-19", category_path: "megafonos" }, "megafonos"],
    [{ name: "Bongo x2", category_path: "percusion" }, "percusion"],
    [{ name: "Ecualizador Crossover Spain 234XL", category_path: "consolas" }, "procesamiento_audio"],
  ] as const;

  for (const [product, family] of cases) assert.equal(productMatchesFamily(product, family), true);
});

test("does not confuse processors with mixing consoles", () => {
  const crossover = { name: "Ecualizador Crossover Spain 234XL", category_path: "consolas" };
  assert.equal(productMatchesFamily(crossover, "procesamiento_audio"), true);
  assert.equal(productMatchesFamily(crossover, "consolas"), false);
});
