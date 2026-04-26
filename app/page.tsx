"use client";

import { useCallback, useRef, useState } from "react";
import type { Preset } from "@/lib/types";

const MAX_DIM = 1568;

type Status = "idle" | "loading" | "done" | "error";

export default function Page() {
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [xmp, setXmp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("preset");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setPreset(null);
    setXmp(null);

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Upload a JPEG, PNG, or WEBP. Camera RAW files (CR2/NEF/ARW/DNG) can't be rendered in the browser — export a JPEG preview from Lightroom first.");
      return;
    }

    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setStatus("loading");
    try {
      const { base64, mediaType, dataUrl } = await resizeAndEncode(file);
      setPreview(dataUrl);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Request failed");
        setStatus("error");
        return;
      }

      setPreset(json.preset);
      const xmpRes = await fetch("/api/xmp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: json.preset }),
      });
      if (xmpRes.ok) {
        const text = await xmpRes.text();
        setXmp(text);
      }
      setStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const downloadXmp = useCallback(() => {
    if (!xmp) return;
    const blob = new Blob([xmp], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(preset?.preset_name || fileName)}.xmp`;
    a.click();
    URL.revokeObjectURL(url);
  }, [xmp, preset, fileName]);

  return (
    <main className="min-h-screen px-6 py-10 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">AI Lightroom Preset Generator</h1>
        <p className="text-neutral-400 mt-2 text-sm leading-relaxed">
          Upload a JPEG. Llama 4 Maverick (vision) analyzes the image and generates a Lightroom Classic <code className="text-neutral-300">.xmp</code> preset
          tuned to its lighting and mood. Subtle, professional edits — never the same recipe twice.
        </p>
        <p className="text-neutral-500 mt-2 text-xs">
          Shooting RAW? Export a JPEG preview from Lightroom (or use the in-camera JPEG), upload it here, then apply
          the resulting .xmp to your RAW inside Lightroom Classic.
        </p>
      </header>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-neutral-700 hover:border-neutral-500 transition-colors rounded-2xl p-10 text-center bg-neutral-900/40"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onSelect}
          className="hidden"
        />
        {preview ? (
          <img src={preview} alt="preview" className="mx-auto max-h-[420px] rounded-lg shadow-2xl" />
        ) : (
          <div className="text-neutral-400">
            <p className="text-lg">Drop a photo here, or click to choose</p>
            <p className="text-xs mt-2">JPEG / PNG / WEBP — auto-resized client-side</p>
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="mt-8 text-neutral-400 text-sm flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          Analyzing image and crafting preset… this takes 20–60s.
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {preset && (
        <section className="mt-10 grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">{preset.preset_name}</h2>
                <p className="text-xs text-neutral-500 mt-1">{preset.scene_analysis.subject}</p>
              </div>
              <button
                onClick={downloadXmp}
                disabled={!xmp}
                className="shrink-0 px-4 py-2 rounded-lg bg-amber-400 text-black text-sm font-medium hover:bg-amber-300 disabled:opacity-40"
              >
                Download .xmp
              </button>
            </div>
            <dl className="text-sm space-y-2 text-neutral-300">
              <Row label="Lighting" value={preset.scene_analysis.lighting} />
              <Row label="Mood" value={preset.scene_analysis.mood} />
              <Row label="Notes" value={preset.scene_analysis.notes} />
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="font-semibold mb-3">Basic</h3>
            <Grid obj={preset.basic} />
            <h3 className="font-semibold mt-6 mb-3">Color Grading</h3>
            <div className="text-xs text-neutral-400 space-y-1">
              <div>Shadows — H {preset.color_grading.shadows.hue}° / S {preset.color_grading.shadows.saturation} / L {preset.color_grading.shadows.luminance}</div>
              <div>Midtones — H {preset.color_grading.midtones.hue}° / S {preset.color_grading.midtones.saturation} / L {preset.color_grading.midtones.luminance}</div>
              <div>Highlights — H {preset.color_grading.highlights.hue}° / S {preset.color_grading.highlights.saturation} / L {preset.color_grading.highlights.luminance}</div>
              <div className="text-neutral-500 pt-1">Blending {preset.color_grading.blending} · Balance {preset.color_grading.balance}</div>
            </div>
            <h3 className="font-semibold mt-6 mb-3">HSL</h3>
            <HslTable hsl={preset.hsl} />
          </div>
        </section>
      )}

      <footer className="mt-16 text-xs text-neutral-600 text-center">
        Built with Llama 4 Maverick vision on Groq · Schema-validated output
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-neutral-500 w-20 shrink-0">{label}</dt>
      <dd className="text-neutral-200">{value}</dd>
    </div>
  );
}

function Grid({ obj }: { obj: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex justify-between border-b border-neutral-800/60 py-1">
          <span className="text-neutral-500 capitalize">{k.replace(/_/g, " ")}</span>
          <span className="text-neutral-200 font-mono">{v}</span>
        </div>
      ))}
    </div>
  );
}

function HslTable({ hsl }: { hsl: Preset["hsl"] }) {
  const colors = ["red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta"] as const;
  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full">
        <thead>
          <tr className="text-neutral-500">
            <th className="text-left font-normal pb-1"></th>
            {colors.map((c) => (
              <th key={c} className="font-normal pb-1 capitalize text-right">{c.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {(["hue", "saturation", "luminance"] as const).map((row) => (
            <tr key={row} className="border-t border-neutral-800/60">
              <td className="text-neutral-500 capitalize py-1">{row.slice(0, 3)}</td>
              {colors.map((c) => (
                <td key={c} className="text-right text-neutral-200">{hsl[row][c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function resizeAndEncode(file: File): Promise<{ base64: string; mediaType: string; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9);
  });

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  return { base64, mediaType: "image/jpeg", dataUrl };
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "preset";
}
