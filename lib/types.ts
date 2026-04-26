import { z } from "zod";

const HSL_COLORS = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"] as const;

const hslGroup = z.object({
  red: z.number().int().min(-100).max(100),
  orange: z.number().int().min(-100).max(100),
  yellow: z.number().int().min(-100).max(100),
  green: z.number().int().min(-100).max(100),
  aqua: z.number().int().min(-100).max(100),
  blue: z.number().int().min(-100).max(100),
  purple: z.number().int().min(-100).max(100),
  magenta: z.number().int().min(-100).max(100),
});

const colorGradeBand = z.object({
  hue: z.number().int().min(0).max(360),
  saturation: z.number().int().min(0).max(100),
  luminance: z.number().int().min(-100).max(100),
});

export const PresetSchema = z.object({
  scene_analysis: z.object({
    subject: z.string().describe("What the photo depicts (e.g., 'overcast mountain landscape', 'indoor portrait, warm tungsten')"),
    lighting: z.string().describe("Lighting condition observed"),
    mood: z.string().describe("Intended emotional/aesthetic direction for the edit"),
    notes: z.string().describe("Why these specific adjustments fit this image"),
  }),
  basic: z.object({
    temperature: z.number().int().min(-100).max(100).describe("White balance shift. Negative = cooler, positive = warmer."),
    tint: z.number().int().min(-100).max(100).describe("Green/magenta shift."),
    exposure: z.number().min(-2).max(2).describe("Stops. Keep subtle, usually -0.5 to +0.5."),
    contrast: z.number().int().min(-30).max(30).describe("KEEP MODEST. Never exceed +25. Most images: -10 to +15."),
    highlights: z.number().int().min(-100).max(100),
    shadows: z.number().int().min(-100).max(100),
    whites: z.number().int().min(-50).max(50),
    blacks: z.number().int().min(-50).max(50),
    texture: z.number().int().min(-50).max(50),
    clarity: z.number().int().min(-30).max(0).describe("ALWAYS negative or zero. Never positive — clarity boosts look amateur."),
    dehaze: z.number().int().min(-30).max(30),
    vibrance: z.number().int().min(-50).max(50),
    saturation: z.number().int().min(-30).max(30).describe("Usually negative or zero for cinematic look."),
  }),
  hsl: z.object({
    hue: hslGroup,
    saturation: hslGroup,
    luminance: hslGroup,
  }),
  color_grading: z.object({
    shadows: colorGradeBand,
    midtones: colorGradeBand,
    highlights: colorGradeBand,
    blending: z.number().int().min(0).max(100),
    balance: z.number().int().min(-100).max(100),
  }),
  detail: z.object({
    sharpness: z.number().int().min(0).max(100),
    sharpen_radius: z.number().min(0.5).max(3),
    sharpen_detail: z.number().int().min(0).max(100),
    sharpen_masking: z.number().int().min(0).max(100),
    luminance_noise: z.number().int().min(0).max(100),
    color_noise: z.number().int().min(0).max(100),
  }),
  preset_name: z.string().describe("Short descriptive name for the preset, e.g. 'Overcast Peak — Cool Cinematic'"),
});

export type Preset = z.infer<typeof PresetSchema>;
export const HSL_KEYS = HSL_COLORS;
