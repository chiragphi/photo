import type { Preset } from "./types";

const HSL_KEYS = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"] as const;
const HSL_LOOKUP: Record<(typeof HSL_KEYS)[number], keyof Preset["hsl"]["hue"]> = {
  Red: "red",
  Orange: "orange",
  Yellow: "yellow",
  Green: "green",
  Aqua: "aqua",
  Blue: "blue",
  Purple: "purple",
  Magenta: "magenta",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmt(n: number, decimals = 0): string {
  if (decimals === 0) return String(Math.round(n));
  const v = Number(n.toFixed(decimals));
  return Number.isInteger(v) ? `${v}` : `${v}`;
}

function tempToKelvinShift(temperature: number): number {
  // Lightroom stores Temperature as a Kelvin-like value when the file is a sidecar to a real RAW.
  // For a generic preset (no RAW reference), Lightroom interprets these as relative offsets.
  // Use Adobe's "as-shot relative" range: -100..100 maps roughly to -2000..+2000 Kelvin offset baseline 5500.
  return Math.round(5500 + (temperature / 100) * 2000);
}

export function buildXmp(preset: Preset): string {
  const { basic, hsl, color_grading, detail, preset_name } = preset;
  const name = escapeXml(preset_name || "AI Preset");
  const uuid = cryptoUuid();

  const hslLines = HSL_KEYS.map((k) => {
    const lk = HSL_LOOKUP[k];
    return `    crs:HueAdjustment${k}="${fmt(hsl.hue[lk])}"
    crs:SaturationAdjustment${k}="${fmt(hsl.saturation[lk])}"
    crs:LuminanceAdjustment${k}="${fmt(hsl.luminance[lk])}"`;
  }).join("\n");

  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Cluster=""
   crs:UUID="${uuid}"
   crs:SupportsAmount="False"
   crs:SupportsColor="True"
   crs:SupportsMonochrome="False"
   crs:SupportsHighDynamicRange="True"
   crs:SupportsNormalDynamicRange="True"
   crs:SupportsSceneReferred="True"
   crs:SupportsOutputReferred="True"
   crs:CameraModelRestriction=""
   crs:Copyright=""
   crs:ContactInfo=""
   crs:Version="15.0"
   crs:ProcessVersion="15.4"
   crs:WhiteBalance="Custom"
   crs:Temperature="${tempToKelvinShift(basic.temperature)}"
   crs:Tint="${fmt(basic.tint)}"
   crs:Exposure2012="${fmt(basic.exposure, 2)}"
   crs:Contrast2012="${fmt(basic.contrast)}"
   crs:Highlights2012="${fmt(basic.highlights)}"
   crs:Shadows2012="${fmt(basic.shadows)}"
   crs:Whites2012="${fmt(basic.whites)}"
   crs:Blacks2012="${fmt(basic.blacks)}"
   crs:Texture="${fmt(basic.texture)}"
   crs:Clarity2012="${fmt(basic.clarity)}"
   crs:Dehaze="${fmt(basic.dehaze)}"
   crs:Vibrance="${fmt(basic.vibrance)}"
   crs:Saturation="${fmt(basic.saturation)}"
   crs:Sharpness="${fmt(detail.sharpness)}"
   crs:SharpenRadius="${fmt(detail.sharpen_radius, 1)}"
   crs:SharpenDetail="${fmt(detail.sharpen_detail)}"
   crs:SharpenEdgeMasking="${fmt(detail.sharpen_masking)}"
   crs:LuminanceSmoothing="${fmt(detail.luminance_noise)}"
   crs:ColorNoiseReduction="${fmt(detail.color_noise)}"
   crs:ColorNoiseReductionDetail="50"
   crs:ColorNoiseReductionSmoothness="50"
   crs:ColorGradeMidtoneHue="${fmt(color_grading.midtones.hue)}"
   crs:ColorGradeMidtoneSat="${fmt(color_grading.midtones.saturation)}"
   crs:ColorGradeShadowLum="${fmt(color_grading.shadows.luminance)}"
   crs:ColorGradeMidtoneLum="${fmt(color_grading.midtones.luminance)}"
   crs:ColorGradeHighlightLum="${fmt(color_grading.highlights.luminance)}"
   crs:ColorGradeBlending="${fmt(color_grading.blending)}"
   crs:ColorGradeGlobalHue="0"
   crs:ColorGradeGlobalSat="0"
   crs:ColorGradeGlobalLum="0"
   crs:SplitToningShadowHue="${fmt(color_grading.shadows.hue)}"
   crs:SplitToningShadowSaturation="${fmt(color_grading.shadows.saturation)}"
   crs:SplitToningHighlightHue="${fmt(color_grading.highlights.hue)}"
   crs:SplitToningHighlightSaturation="${fmt(color_grading.highlights.saturation)}"
   crs:SplitToningBalance="${fmt(color_grading.balance)}"
   crs:ParametricShadows="0"
   crs:ParametricDarks="0"
   crs:ParametricLights="0"
   crs:ParametricHighlights="0"
   crs:ParametricShadowSplit="25"
   crs:ParametricMidtoneSplit="50"
   crs:ParametricHighlightSplit="75"
${hslLines}
   crs:ConvertToGrayscale="False"
   crs:ToneCurveName2012="Linear"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${name}</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:ShortName>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${name}</rdf:li>
    </rdf:Alt>
   </crs:ShortName>
   <crs:SortName>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${name}</rdf:li>
    </rdf:Alt>
   </crs:SortName>
   <crs:Group>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">AI Presets</rdf:li>
    </rdf:Alt>
   </crs:Group>
   <crs:Description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(preset.scene_analysis.notes)}</rdf:li>
    </rdf:Alt>
   </crs:Description>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
  return xmp;
}

function cryptoUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().toUpperCase();
  // Fallback
  const hex = "0123456789ABCDEF";
  let out = "";
  for (let i = 0; i < 32; i++) out += hex[Math.floor(Math.random() * 16)];
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
}
