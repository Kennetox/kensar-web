import { NextResponse } from "next/server";

type KoraEventBody = {
  event?: string;
  path?: string;
  timestamp?: string;
  payload?: Record<string, string | number | boolean | null>;
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength).trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as KoraEventBody;
    const event = sanitizeText(body.event, 64);
    const path = sanitizeText(body.path, 140);
    const timestamp = sanitizeText(body.timestamp, 64);

    if (!event || !path || !timestamp) {
      return NextResponse.json({ ok: false, detail: "Invalid event payload" }, { status: 400 });
    }

    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

    console.info("[KORA_EVENT]", {
      event,
      path,
      timestamp,
      payload,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, detail: "Unable to parse event" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
