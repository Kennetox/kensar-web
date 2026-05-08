import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type TelemetryBody = {
  event_type?: string;
  event_name?: string;
  sessionId?: string;
  timestamp?: string;
  userMessage?: string | null;
  normalizedMessage?: string | null;
  detectedIntent?: string | null;
  detectedCategory?: string | null;
  detectedAttributes?: string[] | null;
  resolverUsed?: string | null;
  responseType?: string | null;
  pageContext?: Record<string, unknown> | null;
  productIdsShown?: number[] | null;
  clickedProductId?: number | null;
  clickedWhatsApp?: boolean | null;
  fallbackUsed?: boolean | null;
  conversationMessageCount?: number | null;
  routePath?: string | null;
  actionType?: string | null;
  actionId?: string | null;
  actionValue?: string | null;
  handoff_origin?: string | null;
  handoff_need?: string | null;
  handoff_intent_detected?: string | null;
  handoff_product_slug?: string | null;
  handoff_product_sku?: string | null;
  handoff_category?: string | null;
  handoff_product_price?: number | null;
  handoff_message_length?: number | null;
  handoff_has_memory_context?: boolean | null;
};

function text(value: unknown, max = 280) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function boolOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function numOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeStringArray(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((row) => text(row, 80))
    .filter(Boolean)
    .slice(0, max);
}

function sanitizeNumberArray(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [] as number[];
  return value
    .map((row) => Number(row))
    .filter((row) => Number.isFinite(row))
    .slice(0, max);
}

function sanitizePageContext(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  return {
    pageType: text(source.pageType, 32) || "unknown",
    categorySlug: text(source.categorySlug, 120) || null,
    categoryName: text(source.categoryName, 120) || null,
    subcategorySlug: text(source.subcategorySlug, 120) || null,
    subcategoryName: text(source.subcategoryName, 120) || null,
    productId: text(source.productId, 80) || null,
    productName: text(source.productName, 160) || null,
    productCategory: text(source.productCategory, 120) || null,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelemetryBody;
    const sessionId = text(body.sessionId, 80);
    const eventType = text(body.event_type, 80);
    const timestamp = text(body.timestamp, 64);
    if (!sessionId || !eventType || !timestamp) {
      return NextResponse.json({ ok: false, detail: "invalid telemetry payload" }, { status: 400 });
    }

    const record = {
      event_type: eventType,
      event_name: body.event_name ? text(body.event_name, 80) : null,
      session_id: sessionId,
      timestamp,
      user_message: body.userMessage ? text(body.userMessage, 300) : null,
      normalized_message: body.normalizedMessage ? text(body.normalizedMessage, 300) : null,
      detected_intent: body.detectedIntent ? text(body.detectedIntent, 80) : null,
      detected_category: body.detectedCategory ? text(body.detectedCategory, 120) : null,
      detected_attributes: sanitizeStringArray(body.detectedAttributes, 12),
      resolver_used: body.resolverUsed ? text(body.resolverUsed, 80) : null,
      response_type: body.responseType ? text(body.responseType, 80) : null,
      page_context: sanitizePageContext(body.pageContext),
      product_ids_shown: sanitizeNumberArray(body.productIdsShown, 20),
      clicked_product_id: numOrNull(body.clickedProductId),
      clicked_whatsapp: boolOrNull(body.clickedWhatsApp),
      fallback_used: boolOrNull(body.fallbackUsed),
      conversation_message_count: numOrNull(body.conversationMessageCount),
      route_path: body.routePath ? text(body.routePath, 180) : null,
      action_type: body.actionType ? text(body.actionType, 60) : null,
      action_id: body.actionId ? text(body.actionId, 120) : null,
      action_value: body.actionValue ? text(body.actionValue, 200) : null,
      handoff_origin: body.handoff_origin ? text(body.handoff_origin, 60) : null,
      handoff_need: body.handoff_need ? text(body.handoff_need, 60) : null,
      handoff_intent_detected: body.handoff_intent_detected ? text(body.handoff_intent_detected, 80) : null,
      handoff_product_slug: body.handoff_product_slug ? text(body.handoff_product_slug, 140) : null,
      handoff_product_sku: body.handoff_product_sku ? text(body.handoff_product_sku, 120) : null,
      handoff_category: body.handoff_category ? text(body.handoff_category, 120) : null,
      handoff_product_price: numOrNull(body.handoff_product_price),
      handoff_message_length: numOrNull(body.handoff_message_length),
      handoff_has_memory_context: boolOrNull(body.handoff_has_memory_context),
    };

    const dir = path.join("/tmp", "kensar-kora-telemetry");
    const dateKey = new Date(timestamp).toISOString().slice(0, 10);
    const filePath = path.join(dir, `${dateKey}.jsonl`);
    await mkdir(dir, { recursive: true });
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf-8");

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, detail: "unable to parse telemetry" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
