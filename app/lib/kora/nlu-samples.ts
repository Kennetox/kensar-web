import { extractKoraEntities, type KoraNluResult } from "./entities";

export const KORA_NLU_SAMPLE_PHRASES = [
  "quiero una guitarra",
  "quiero una cabina",
  "busco una cabina barata",
  "quisiera una guitarra",
  "qué speakers tienes",
  "quiero una cabina potente",
  "algo que suene duro",
  "necesito sonido para iglesia",
  "qué piano me recomiendas",
  "tienen guitarras económicas",
  "microfono inalambrico",
  "micrófono inalámbrico",
  "cámara de seguridad",
  "camaras wifi",
  "quiero cabina para iglesia",
  "necesito sonido para una fiesta",
  "algo potente para negocio",
  "guitarra para empezar",
  "piano para aprender",
  "microfono para cantar",
  "cable para microfono",
  "algo más barato",
  "otro parecido",
  "algo más potente",
  "reflector solar",
  "cable hdmi",
  "cable rca",
  "xlr",
  "cómo son las garantías",
  "reciben nequi?",
  "más barato",
  "otro parecido",
  "quiero algo para empezar",
] as const;

export function runKoraNluSamples() {
  return KORA_NLU_SAMPLE_PHRASES.map((input) => ({
    input,
    output: extractKoraEntities(input),
  }));
}

export type KoraNluSampleOutput = {
  input: string;
  output: KoraNluResult;
};
