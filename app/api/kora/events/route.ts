import { NextResponse } from "next/server";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

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
    const eventPath = sanitizeText(body.path, 140);
    const timestamp = sanitizeText(body.timestamp, 64);

    if (!event || !eventPath || !timestamp) {
      return NextResponse.json({ ok: false, detail: "Invalid event payload" }, { status: 400 });
    }

    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const eventRecord = {
      event,
      path: eventPath,
      timestamp,
      payload,
    };

    const dateKey = new Date(timestamp).toISOString().slice(0, 10);
    const dir = pathJoinSafe("/tmp", "kensar-kora-events");
    const filePath = pathJoinSafe(dir, `${dateKey}.jsonl`);
    await mkdir(dir, { recursive: true });
    await appendFile(filePath, `${JSON.stringify(eventRecord)}\n`, "utf-8");

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, detail: "Unable to parse event" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

function pathJoinSafe(...parts: string[]) {
  return path.join(...parts);
}
