# AI Lightroom Preset Generator

Upload a photo. Llama 4 Maverick (vision) on Groq analyzes it and generates a Lightroom Classic `.xmp` preset tailored to that specific image — no generic recipes, no over-contrast.

## What it does

- Accepts a JPEG / PNG / WEBP upload
- Resizes client-side (max 1568px) so Vercel's body limit isn't a problem
- Sends the image to Llama 4 Maverick (vision) with a strict system prompt: read scene + lighting + mood, produce subtle professional adjustments, vary the edit per image
- Validates the response against a Zod schema (Basic, HSL, Color Grading, Detail panels)
- Generates a Lightroom Classic `.xmp` Develop preset that drops straight into `~/Library/Application Support/Adobe/CameraRaw/Settings/User Presets/` (macOS) or `%APPDATA%\Adobe\CameraRaw\Settings\User Presets\` (Windows)

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS
- `groq-sdk` with `meta-llama/llama-4-maverick-17b-128e-instruct` + JSON response mode
- Zod for response validation

## Get a Groq API key (free tier)

1. Visit https://console.groq.com/keys
2. Sign in (Google / GitHub / email)
3. Click **Create API Key** → name it anything
4. Copy the key (starts with `gsk_...`)

The free tier on Groq covers normal personal use without a credit card. Llama 4 Maverick has generous daily request limits.

## Local development

```bash
npm install
cp .env.example .env.local        # paste your GROQ_API_KEY
npm run dev
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo.
3. Add env var: `GROQ_API_KEY=gsk_...`
4. Deploy.

The API route runs on the Node.js runtime with `maxDuration = 60s`.

## Workflow for RAW shooters

Browsers can't render camera RAW files (CR2 / NEF / ARW / DNG). Workflow:

1. In Lightroom Classic, export a flat JPEG preview of your RAW (sRGB, quality 80, ~2000px is plenty).
2. Upload the JPEG here.
3. Download the generated `.xmp`.
4. In Lightroom Classic: **Develop module → Presets panel → right-click → Import Preset…** select the `.xmp`.
5. Apply the preset to your original RAW. Tweak from there.

The preset uses the standard `crs:` namespace and all 2012 process keys (Highlights2012, Shadows2012, etc.), so it works on any RAW format Lightroom Classic supports.

## Why it doesn't make every photo look the same

The system prompt forces the model to:

- Identify the actual scene (overcast mountain, golden-hour portrait, neon street, etc.)
- Choose adjustments justified by what's in the frame
- Cap contrast at +25; clarity always ≤ 0 (negative clarity = clean refined look, positive = amateur HDR)
- Prefer Vibrance over Saturation; keep global Saturation 0 to -10
- Drive cinematic looks through Color Grading hues, not by smashing contrast

The schema covers Temperature, Tint, full Basic panel, all 24 HSL sliders, full Color Grading wheels (shadows / midtones / highlights), Detail (sharpening + noise reduction), and a descriptive preset name like "Foggy Pine Ridge — Muted Cinematic".

## Notes

- `Temperature` in the XMP is written as a Kelvin value derived from the model's -100..100 white-balance score. Lightroom interprets it sensibly when applied to a real RAW; if applied to a JPEG, it acts as a relative WB shift.
- The first time you import the `.xmp`, Lightroom may put it under the **AI Presets** group.
- API errors / validation failures are returned to the UI as readable messages.
