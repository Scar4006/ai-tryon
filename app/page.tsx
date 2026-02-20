"use client";

import { useMemo, useState } from "react";

function dataUrlToFile(dataUrl: string, filename: string) {
  const [head, base64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] || "image/png";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

/**
 * Creates a simple mask:
 * - White background (preserve)
 * - Black rectangle in the "clothing region" (inpaint)
 */
async function makeAutoMaskForClothes(imageFile: File) {
  const imgUrl = URL.createObjectURL(imageFile);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = imgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  // Start with white (preserve)
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Black rectangle approx torso+legs area (inpaint)
  // You can tweak these ratios later.
  const x = canvas.width * 0.18;
  const y = canvas.height * 0.18;
  const w = canvas.width * 0.64;
  const h = canvas.height * 0.72;

  ctx.fillStyle = "black";
  ctx.fillRect(x, y, w, h);

  const maskDataUrl = canvas.toDataURL("image/png");
  URL.revokeObjectURL(imgUrl);
  return dataUrlToFile(maskDataUrl, "mask.png");
}

export default function Home() {
  const [prompt, setPrompt] = useState("mens outfit: clean smart casual, white oxford shirt, beige chinos, loafers");
  const [aspect, setAspect] = useState("1:1");
  const [magic, setMagic] = useState("Auto");

  const [person, setPerson] = useState<File | null>(null);

  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const mode = useMemo(() => (person ? "Inpaint my photo" : "Text-to-image"), [person]);

  async function generate() {
    setStatus("Generating…");
    setResultUrl("");

    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("aspect_ratio", aspect);
    fd.append("magic_prompt_option", magic);

    if (person) {
      // Auto-mask clothing region
      const mask = await makeAutoMaskForClothes(person);
      fd.append("image", person);
      fd.append("mask", mask);
    }

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? "unknown"}`);
      return;
    }

    // Always proxy the final image (stable)
    setResultUrl(`/api/img?url=${encodeURIComponent(data.imageUrl)}`);
    setStatus("Done ✅");
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Ideogram Try-On (Inpainting) — v1</h1>
          <p className="text-sm text-gray-500">
            Mode: <span className="font-semibold">{mode}</span> (prompt required, upload optional)
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Prompt</label>
              <textarea
                className="w-full rounded-xl border p-2 text-sm"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Tip: If you upload a photo, the black region of the mask will be edited (clothes area).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold">Aspect ratio</label>
                <select className="w-full rounded-xl border p-2 text-sm" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                  <option value="4:3">4:3</option>
                  <option value="9:16">9:16</option>
                  <option value="16:9">16:9</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold">Magic prompt</label>
                <select className="w-full rounded-xl border p-2 text-sm" value={magic} onChange={(e) => setMagic(e.target.value)}>
                  <option value="Auto">Auto</option>
                  <option value="On">On</option>
                  <option value="Off">Off</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold">Upload person image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setPerson(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-gray-500">
                If you upload, we inpaint clothing region (simple auto mask for now).
              </p>
            </div>

            <button
              className="w-full rounded-xl bg-black py-2 font-semibold text-white disabled:bg-gray-300"
              onClick={generate}
              disabled={!prompt.trim()}
            >
              Generate
            </button>

            <div className="text-sm text-gray-600">{status}</div>
          </section>

          <section className="rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Result</div>
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt="result" className="w-full rounded-xl border" />
            ) : (
              <div className="text-sm text-gray-400">No result yet.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
