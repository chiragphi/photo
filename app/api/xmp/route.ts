import { NextResponse } from "next/server";
import { PresetSchema } from "@/lib/types";
import { buildXmp } from "@/lib/xmp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const presetField = (body as { preset?: unknown })?.preset;
  const result = PresetSchema.safeParse(presetField);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid preset", issues: result.error.issues }, { status: 400 });
  }

  const xml = buildXmp(result.data);
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
