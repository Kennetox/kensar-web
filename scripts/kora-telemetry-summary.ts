import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type TelemetryEvent = {
  event_type?: string;
  session_id?: string;
  timestamp?: string;
  user_message?: string | null;
  normalized_message?: string | null;
  detected_intent?: string | null;
  detected_category?: string | null;
  detected_attributes?: string[] | null;
  resolver_used?: string | null;
  response_type?: string | null;
  product_ids_shown?: number[] | null;
  clicked_product_id?: number | null;
  clicked_whatsapp?: boolean | null;
  fallback_used?: boolean | null;
  conversation_message_count?: number | null;
};

type CountMap = Map<string, number>;

function inc(map: CountMap, key: string, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + by);
}

function topN(map: CountMap, n = 10) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function fmtPct(num: number, den: number) {
  if (!den) return "0.0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}

function dateFromArg() {
  const arg = process.argv[2]?.trim();
  if (arg && /^\d{4}-\d{2}-\d{2}$/.test(arg)) return arg;
  return new Date().toISOString().slice(0, 10);
}

function toList(rows: Array<[string, number]>, empty = "- (sin datos)") {
  if (!rows.length) return empty;
  return rows.map(([key, value]) => `- ${key}: ${value}`).join("\n");
}

function main() {
  const dateKey = dateFromArg();
  const baseDir = "/tmp/kensar-kora-telemetry";
  const filePath = path.join(baseDir, `${dateKey}.jsonl`);

  if (!existsSync(filePath)) {
    console.log(`[KORA Telemetry] No existe archivo para ${dateKey}: ${filePath}`);
    console.log("Tip: ejecuta el chat y vuelve a correr el resumen o pasa otra fecha: npm run kora:telemetry:summary -- YYYY-MM-DD");
    return;
  }

  const lines = readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const events: TelemetryEvent[] = [];
  let invalidLines = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as TelemetryEvent;
      events.push(parsed);
    } catch {
      invalidLines += 1;
    }
  }

  const prompts = new Map<string, number>();
  const intents = new Map<string, number>();
  const categories = new Map<string, number>();
  const attributes = new Map<string, number>();
  const resolvers = new Map<string, number>();
  const responseTypes = new Map<string, number>();
  const productClicks = new Map<string, number>();
  const fallbackPrompts = new Map<string, number>();
  const noCategoryPrompts = new Map<string, number>();
  const noAttrPrompts = new Map<string, number>();
  const sessionMsgMax = new Map<string, number>();

  const sessionIds = new Set<string>();
  let conversationTurns = 0;
  let interactionClicks = 0;
  let fallbackCount = 0;
  let whatsappClicks = 0;

  for (const event of events) {
    const sessionId = String(event.session_id || "").trim();
    if (sessionId) sessionIds.add(sessionId);

    const msgCount = Number(event.conversation_message_count || 0);
    if (sessionId && Number.isFinite(msgCount) && msgCount > 0) {
      const current = sessionMsgMax.get(sessionId) || 0;
      if (msgCount > current) sessionMsgMax.set(sessionId, msgCount);
    }

    if (event.event_type === "conversation_turn") {
      conversationTurns += 1;

      const prompt = String(event.user_message || "").trim();
      if (prompt) inc(prompts, prompt);

      const intent = String(event.detected_intent || "").trim();
      if (intent) inc(intents, intent);

      const category = String(event.detected_category || "").trim();
      if (category) {
        inc(categories, category);
      } else if (prompt) {
        inc(noCategoryPrompts, prompt);
      }

      const attrs = Array.isArray(event.detected_attributes)
        ? event.detected_attributes.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      if (attrs.length) {
        attrs.forEach((attr) => inc(attributes, attr));
      } else if (prompt) {
        inc(noAttrPrompts, prompt);
      }

      const resolver = String(event.resolver_used || "").trim();
      if (resolver) inc(resolvers, resolver);

      const responseType = String(event.response_type || "").trim();
      if (responseType) inc(responseTypes, responseType);

      if (event.fallback_used === true) {
        fallbackCount += 1;
        if (prompt) inc(fallbackPrompts, prompt);
      }
    }

    if (event.event_type === "interaction_click") {
      interactionClicks += 1;
      if (event.clicked_whatsapp === true) whatsappClicks += 1;
      const productId = Number(event.clicked_product_id || 0);
      if (Number.isFinite(productId) && productId > 0) {
        inc(productClicks, String(productId));
      }
    }
  }

  const topPrompts = topN(prompts, 15);
  const topIntents = topN(intents, 10);
  const topCategories = topN(categories, 10);
  const topAttributes = topN(attributes, 12);
  const topResolvers = topN(resolvers, 10);
  const topResponseTypes = topN(responseTypes, 10);
  const topProductClicks = topN(productClicks, 10);
  const topFallbackPrompts = topN(fallbackPrompts, 15);
  const topNoCategoryPrompts = topN(noCategoryPrompts, 15);
  const topNoAttrPrompts = topN(noAttrPrompts, 15);
  const topConversationDepth = [...sessionMsgMax.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const fallbackRate = fmtPct(fallbackCount, conversationTurns);
  const productClickCount = [...productClicks.values()].reduce((acc, value) => acc + value, 0);

  const recommendations: string[] = [];
  if (conversationTurns === 0) {
    recommendations.push("No hay `conversation_turn` aún. Verifica que KoraChat esté enviando telemetría por turno.");
  }
  if (conversationTurns > 0 && fallbackCount / conversationTurns > 0.25) {
    recommendations.push("Fallback alto (>25%). Priorizar tuning de intents/resolvers para prompts frecuentes en fallback.");
  }
  if (conversationTurns > 0 && noCategoryPrompts.size / conversationTurns > 0.2) {
    recommendations.push("Muchas consultas sin categoría detectada. Mejorar detección de categoría y uso de pageContext/memory.");
  }
  if (conversationTurns > 0 && noAttrPrompts.size / conversationTurns > 0.3) {
    recommendations.push("Baja detección de atributos. Revisar aliases comerciales y reglas de interpretación.");
  }
  if (whatsappClicks > 0 && productClickCount === 0) {
    recommendations.push("Hay clics a WhatsApp pero no a productos. Revisar calidad de recomendaciones y CTA de productos.");
  }
  if (!recommendations.length) {
    recommendations.push("Señales estables para soft pilot. Continuar recolectando 3-7 días y revisar tendencias.");
  }

  const markdown = `# KORA Telemetry Summary - ${dateKey}

## Resumen Ejecutivo
- Eventos totales: **${events.length}**
- Líneas inválidas ignoradas: **${invalidLines}**
- Sesiones únicas: **${sessionIds.size}**
- Conversation turns: **${conversationTurns}**
- Interaction clicks: **${interactionClicks}**
- Fallback rate: **${fallbackRate}** (${fallbackCount}/${conversationTurns})
- Clicks a productos: **${productClickCount}**
- Clicks a WhatsApp: **${whatsappClicks}**

## Métricas Principales
### 1. Prompts más usados
${toList(topPrompts)}

### 2. Intents más detectados
${toList(topIntents)}

### 3. Categorías más detectadas
${toList(topCategories)}

### 4. Atributos más detectados
${toList(topAttributes)}

### 5. Resolvers más usados
${toList(topResolvers)}

### 6. Response types más usados
${toList(topResponseTypes)}

## Clicks
### 7. Productos más clickeados (por ID)
${toList(topProductClicks)}

## Fallbacks y Cobertura
### 8. Prompts que terminaron en fallback
${toList(topFallbackPrompts)}

### 9. Prompts sin categoría detectada
${toList(topNoCategoryPrompts)}

### 10. Prompts sin atributos detectados
${toList(topNoAttrPrompts)}

## Conversaciones
### 11. Conversaciones con más mensajes (session_id)
${toList(topConversationDepth)}

## Señales de Mejora Recomendadas
${recommendations.map((item) => `- ${item}`).join("\n")}
`;

  const reportDir = path.join(process.cwd(), "reports", "kora-telemetry");
  mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `${dateKey}-summary.md`);
  writeFileSync(outPath, markdown, "utf-8");

  console.log(`[KORA Telemetry] Resumen generado: ${outPath}`);
  console.log(`[KORA Telemetry] Eventos=${events.length} | Turns=${conversationTurns} | Clicks=${interactionClicks} | FallbackRate=${fallbackRate}`);
}

main();
