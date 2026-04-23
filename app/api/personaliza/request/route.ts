import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

type RequestPayload = {
  query_type?: string;
  message?: string;
  sender_name?: string;
  sender_email?: string | null;
  source?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as RequestPayload;

  const queryType = (payload.query_type || "").trim();
  const message = (payload.message || "").trim();
  const senderName = (payload.sender_name || "").trim();

  if (!queryType || !message || !senderName) {
    return NextResponse.json(
      { detail: "Faltan datos requeridos para registrar la solicitud." },
      { status: 400 }
    );
  }

  const response = await fetchMetrikApi("/pos/contact-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_type: queryType,
      message,
      sender_name: senderName,
      sender_email: payload.sender_email?.trim() || null,
      source: (payload.source || "web_personaliza_instrumento").trim(),
    }),
  });

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}
