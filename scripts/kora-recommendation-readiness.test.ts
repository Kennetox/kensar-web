import assert from "node:assert/strict";
import test from "node:test";

import { extractKoraEntities } from "../app/lib/kora/entities";
import {
  buildRecommendationQualificationQuery,
  resolveRecommendationClarification,
} from "../app/lib/kora/recommendation-readiness";

function clarify(query: string, memory = {}) {
  return resolveRecommendationClarification({ query, nlu: extractKoraEntities(query), memory });
}

test("asks before recommending a generic guitar", () => {
  assert.equal(clarify("Quiero una guitarra")?.family, "guitarras");
});

test("asks for age and level when the guitar is for a child", () => {
  assert.deepEqual(clarify("Necesito una guitarra para mi hijo")?.missing_dimensions, ["edad_tamano", "nivel", "subtipo"]);
});

test("allows an explicit electric guitar use", () => {
  assert.equal(clarify("Busco una guitarra eléctrica para tocar rock"), null);
});

test("remembers an acoustic subtype and asks only for the missing use", () => {
  const memory = {
    last_recommendation_type: "qualification",
    last_recommendation_query: "Estoy buscando una guitarra",
  };
  const subtypeReply = buildRecommendationQualificationQuery("una guitarra acústica", memory);
  const nextQuestion = clarify(subtypeReply);

  assert.equal(subtypeReply, "una guitarra acústica");
  assert.match(nextQuestion?.answer || "", /nos enfocamos en una guitarra acústica/i);
  assert.match(nextQuestion?.answer || "", /comenzar a aprender o ya tienes experiencia/i);
  assert.deepEqual(nextQuestion?.actions.map((action) => action.label), ["Estoy empezando", "Ya sé tocar"]);
  assert.doesNotMatch(nextQuestion?.answer || "", /dime cuál se acerca más a tu idea/i);
});

test("advances to recommendations after answering the progressive guitar question", () => {
  const memory = {
    last_recommendation_type: "qualification",
    last_recommendation_query: "una guitarra acústica",
  };
  const useReply = buildRecommendationQualificationQuery("Estoy empezando y la quiero para aprender en casa", memory);

  assert.equal(clarify(useReply), null);
});

test("asks before recommending a generic cabinet", () => {
  assert.equal(clarify("Quiero una cabina")?.family, "cabinas");
});

test("allows a cabinet query with use and relevant feature", () => {
  assert.equal(clarify("Quiero una cabina potente para una fiesta"), null);
});

test("asks a microphone question when only the use is known", () => {
  assert.equal(clarify("Quiero un micrófono para cantar")?.family, "microfonos");
});

test("allows a wireless karaoke microphone request", () => {
  assert.equal(clarify("Quiero un micrófono inalámbrico para karaoke"), null);
});

test("asks for camera system type before recommending", () => {
  assert.equal(clarify("Quiero una cámara para vigilar la entrada")?.family, "seguridad");
});

test("allows an explicit WiFi entrance camera request", () => {
  assert.equal(clarify("Quiero una cámara WiFi para vigilar la entrada"), null);
});

test("asks for TV size or budget", () => {
  assert.equal(clarify("Quiero un televisor para mi sala")?.family, "televisores");
});

test("does not interrupt a contextual follow-up", () => {
  assert.equal(clarify("Algo más económico", { last_recommended_products: [{ id: 1 }] }), null);
});

test("recognizes new instrument and professional-audio vocabulary", () => {
  const amplifier = extractKoraEntities("necesito un amplificador para mis cabinas");
  assert.equal(amplifier.intent, "product_search");
  assert.equal(amplifier.category, "audio-profesional");

  const ukulele = extractKoraEntities("busco un ukelele para aprender");
  assert.equal(ukulele.intent, "product_search");
  assert.equal(ukulele.category, "instrumentos");
});

test("qualifies keyboards by use and format", () => {
  assert.equal(clarify("Quiero un teclado")?.family, "teclados");
  assert.equal(clarify("Quiero un teclado de 61 teclas para tocar en iglesia"), null);
});

test("requires speaker compatibility before choosing an amplifier", () => {
  assert.deepEqual(clarify("Necesito un amplificador para mis cabinas")?.missing_dimensions, [
    "cabinas_objetivo",
    "potencia_rms",
    "impedancia",
  ]);
  assert.equal(clarify("Necesito amplificador para dos cabinas pasivas de 8 ohm y 500 watts RMS"), null);
});

test("qualifies consoles by use and input count", () => {
  assert.equal(clarify("Quiero una consola")?.family, "consolas");
  assert.equal(clarify("Quiero una consola para iglesia con 8 entradas"), null);
});

test("qualifies audio interfaces by simultaneous sources", () => {
  assert.equal(clarify("Busco una interfaz de audio")?.family, "interfaces_audio");
  assert.equal(clarify("Busco una interfaz de audio para grabar dos entradas en computador"), null);
});

test("checks amplification when recommending an electric bass", () => {
  assert.equal(clarify("Quiero un bajo eléctrico para aprender")?.family, "instrumentos_cuerda");
  assert.equal(clarify("Quiero un bajo eléctrico para aprender y ya tengo amplificador"), null);
});

test("qualifies percussion, megaphones, and audio processors", () => {
  assert.equal(clarify("Busco percusión")?.family, "percusion");
  assert.equal(clarify("Busco un bongo para tocar salsa en grupo"), null);
  assert.equal(clarify("Necesito un megáfono")?.family, "megafonos");
  assert.equal(clarify("Necesito un megáfono recargable para un evento exterior"), null);
  assert.equal(clarify("Necesito un crossover")?.family, "procesamiento_audio");
  assert.equal(clarify("Necesito un crossover para dividir frecuencias en mi sistema de cabinas y amplificador"), null);
});

test("keeps qualification context for a short answer but respects a new product", () => {
  const memory = {
    last_recommendation_type: "qualification",
    last_recommendation_query: "Quiero una consola",
  };
  assert.equal(
    buildRecommendationQualificationQuery("para iglesia con 8 entradas", memory),
    "Quiero una consola para iglesia con 8 entradas"
  );
  assert.equal(buildRecommendationQualificationQuery("Ahora quiero una guitarra", memory), "Ahora quiero una guitarra");
});
