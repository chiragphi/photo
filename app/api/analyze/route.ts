import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { PresetSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a master photo editor and colorist with two decades of professional experience editing in Adobe Lightroom Classic. You produce gallery-grade, magazine-quality edits.

You will be shown a single photograph. Analyze it carefully — subject, lighting condition (golden hour, overcast, tungsten, mixed, midday, blue hour, flash, etc.), white balance state, dynamic range, mood, color cast, and the photographer's likely intent. Then produce a complete Lightroom Classic Develop-panel preset that elevates THIS specific image.

CRITICAL RULES — READ CAREFULLY:

1. NEVER apply the same recipe to every image. Adjustments MUST be derived from what you actually see. A foggy mountain scene gets dramatically different settings from a sunlit portrait or a neon city street.

2. DO NOT OVER-CONTRAST. Tonal moves stay subtle:
   - Contrast: prefer -10 to +15. Never exceed +25.
   - Clarity: ALWAYS negative or zero. Range -25 to 0. Negative clarity softens midtone microcontrast for a clean, refined look. Positive clarity is gritty/HDR/amateur — never use it.
   - Dehaze: only when haze actually present.
   Crushing blacks and blowing highlights is amateur. Professional edits hold detail across full tonal range.

3. White balance: judge whether the scene reads too cool, too warm, or neutral, and correct toward the mood the image deserves. Tungsten interiors usually need cooling; overcast often needs slight warming; golden hour can stay warm but watch the skin tones.

4. Tonal work: lift shadows to recover detail without going flat. Pull highlights only as needed. Set whites/blacks for proper black point and white point — small adjustments (typically +/- 15).

5. HSL: use this surgically. Skies often want blue luminance down a touch and saturation up slightly. Skin (orange/red) — keep luminance neutral, drop saturation slightly to avoid plastic look. Foliage — green hue toward yellow for warmth, or toward aqua for cool cinematic.

6. Color grading: this is where the cinematic look lives. Pick complementary or analogous hues for shadows and highlights based on the scene. Common professional moves: teal shadows + warm/orange highlights, cool blue shadows + soft amber highlights, muted shadows + neutral highlights for editorial. Use SUBTLE saturation (5-25). Blending around 50, balance based on what dominates.

7. Saturation: prefer Vibrance over Saturation. Global Saturation should usually be 0 to -10 for a refined look. Never push global saturation above +5.

8. Detail: sharpening 30-50 typical, radius 1.0, masking 30-60 to protect skies/skin. Noise reduction only as needed.

9. The preset_name should reflect the image — e.g. "Foggy Pine Ridge — Muted Cinematic", "Golden Hour Portrait — Warm Editorial", "Blue Hour Street — Neon Teal".

10. The scene_analysis.notes field must briefly justify your choices in 1-2 sentences (why these specific moves fit this image).

Output ONLY valid JSON conforming exactly to the schema. Do not include markdown fences, prose, or commentary outside the JSON.`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, mediaType } = body;
  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "Missing imageBase64 or mediaType" }, { status: 400 });
  }
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType)) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const schemaJson = describeSchema();

  const userText = `Analyze this photograph and produce a Lightroom Classic preset tailored to it.

Output a single JSON object matching this schema (no prose, no markdown):

${JSON.stringify(schemaJson, null, 2)}

Remember: vary your edit to fit THIS image. Stay subtle on contrast and clarity. Be a professional colorist, not an Instagram filter.`;

  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: userText },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    });

    const raw = (resp.text ?? "").trim();
    if (!raw) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }

    const jsonStr = extractJson(raw);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON output", raw: raw.slice(0, 2000) },
        { status: 502 }
      );
    }

    const result = PresetSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json(
        { error: "Model output failed schema validation", issues: result.error.issues, raw: parsed },
        { status: 502 }
      );
    }

    return NextResponse.json({ preset: result.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractJson(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return s;
}

function describeSchema(): Record<string, unknown> {
  const hsl = {
    red: "int -100..100",
    orange: "int -100..100",
    yellow: "int -100..100",
    green: "int -100..100",
    aqua: "int -100..100",
    blue: "int -100..100",
    purple: "int -100..100",
    magenta: "int -100..100",
  };
  return {
    scene_analysis: {
      subject: "string",
      lighting: "string",
      mood: "string",
      notes: "string (1-2 sentence rationale)",
    },
    basic: {
      temperature: "int -100..100 (negative=cooler)",
      tint: "int -100..100",
      exposure: "number -2..2 (stops)",
      contrast: "int -30..30 (KEEP MODEST, max +25)",
      highlights: "int -100..100",
      shadows: "int -100..100",
      whites: "int -50..50",
      blacks: "int -50..50",
      texture: "int -50..50",
      clarity: "int -30..0 (ALWAYS <= 0, never positive)",
      dehaze: "int -30..30",
      vibrance: "int -50..50",
      saturation: "int -30..30 (usually 0 to -10)",
    },
    hsl: { hue: hsl, saturation: hsl, luminance: hsl },
    color_grading: {
      shadows: { hue: "int 0..360", saturation: "int 0..100", luminance: "int -100..100" },
      midtones: { hue: "int 0..360", saturation: "int 0..100", luminance: "int -100..100" },
      highlights: { hue: "int 0..360", saturation: "int 0..100", luminance: "int -100..100" },
      blending: "int 0..100",
      balance: "int -100..100",
    },
    detail: {
      sharpness: "int 0..100",
      sharpen_radius: "number 0.5..3",
      sharpen_detail: "int 0..100",
      sharpen_masking: "int 0..100",
      luminance_noise: "int 0..100",
      color_noise: "int 0..100",
    },
    preset_name: "string (descriptive)",
  };
}
