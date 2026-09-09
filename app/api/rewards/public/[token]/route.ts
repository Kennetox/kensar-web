import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

type Context = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  const response = await fetchMetrikApi(`/rewards/public/${encodeURIComponent(token)}`);
  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}

export async function POST(_request: Request, context: Context) {
  const { token } = await context.params;
  const response = await fetchMetrikApi(`/rewards/public/${encodeURIComponent(token)}/activate`, {
    method: "POST",
  });
  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}
