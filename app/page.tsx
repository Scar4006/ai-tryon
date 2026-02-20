"use client";
import { useState, useRef, useCallback } from "react";

const PROMPT_CATEGORIES = [
  {
    id: "style",
    label: "Style",
    icon: "✦",
    chips: [
      "Casual everyday",
      "Smart casual",
      "Streetwear",
      "Formal / tailored",
      "Business chic",
      "Athleisure",
      "Bohemian",
      "Preppy",
    ],
  },
  {
    id: "occasion",
    label: "Occasion",
    icon: "◈",
    chips: [
      "Beach day",
      "Date night",
      "Office ready",
      "Weekend brunch",
      "Festival",
      "Wedding guest",
      "First day of work",
      "Night out",
    ],
  },
  {
    id: "vibe",
    label: "Vibe",
    icon: "◉",
    chips: [
      "Minimalist",
      "Y2K",
      "Cottagecore",
      "Dark academia",
      "Old money",
      "Coastal grandmother",
      "Clean girl",
      "Maximalist",
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataUrlToFile(dataUrl: string, filename: string) {
  const [head, base64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] || "image/png";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

/**
 * Simple v1 auto-mask:
 * - White background = preserve
 * - Black rectangle = inpaint (edit) clothing region
 */
async function makeAutoMaskForClothes(imageFile: File) {
  const url = URL.createObjectURL(imageFile);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x = canvas.width * 0.18;
  const y = canvas.height * 0.18;
  const w = canvas.width * 0.64;
  const h = canvas.height * 0.72;

  ctx.fillStyle = "black";
  ctx.fillRect(x, y, w, h);

  const maskDataUrl = canvas.toDataURL("image/png");
  URL.revokeObjectURL(url);

  return dataUrlToFile(maskDataUrl, "mask.png");
}

// ✅ Upload helper (Vercel Blob via /api/upload)
async function uploadToBlob(file: File, kind: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Upload failed");
  return data.url as string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeCategory, setActiveCategory] = useState("style");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto({ file: f, preview: e.target?.result as string });
    reader.readAsDataURL(f);
  }, []);

  const toggleChip = (chip: string) =>
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );

  const builtPrompt = [...selectedChips, customPrompt.trim()].filter(Boolean).join(", ");

  // ✅ NEW generate() flow: upload → generate using URLs → proxy image
  async function generate() {
    if (!photo || !builtPrompt) return;

    setStatus("loading");
    setResultUrl("");
    setErrorMsg("");

    try {
      // 1) Create mask locally (small)
      const maskFile = await makeAutoMaskForClothes(photo.file);

      // 2) Upload image + mask to Blob → get URLs (tiny payload later)
      const [imageUrl, maskUrl] = await Promise.all([
        uploadToBlob(photo.file, "image"),
        uploadToBlob(maskFile, "mask"),
      ]);

      // 3) Call server generate route with URLs (NOT files)
      const fd = new FormData();
      fd.append("prompt", builtPrompt);
      fd.append("imageUrl", imageUrl);
      fd.append("maskUrl", maskUrl);

      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.error ?? "Something went wrong");
        return;
      }

      // 4) Always proxy through /api/img so it renders reliably
      setResultUrl(`/api/img?url=${encodeURIComponent(data.imageUrl)}`);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Something went wrong");
    }
  }

  const canGenerate = !!photo && !!builtPrompt && status !== "loading";

  return (
    <>
      {/* everything below is exactly your UI (unchanged) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #f6f0e6;
          --cream-mid: #ede4d5;
          --cream-deep: #e0d3c0;
          --warm-brown: #6b4c2a;
          --mid-brown: #9b7045;
          --light-brown: #c4a07a;
          --text-dark: #2a1f12;
          --text-mid: #7a6245;
          --text-light: #b09878;
          --border: rgba(160, 130, 90, 0.2);
          --glass: rgba(255, 252, 246, 0.7);
          --shadow-sm: 0 2px 12px rgba(100, 70, 30, 0.08);
          --shadow-md: 0 8px 32px rgba(100, 70, 30, 0.12);
        }
        body {
          font-family: 'Jost', sans-serif;
          background: var(--cream);
          color: var(--text-dark);
          min-height: 100vh;
        }
        .bg-layer {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 100% 80% at 0% 0%, rgba(220,200,170,0.6) 0%, transparent 55%),
            radial-gradient(ellipse 70% 60% at 100% 100%, rgba(200,175,140,0.45) 0%, transparent 55%),
            var(--cream);
        }
        .bg-grain {
          position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .root {
          position: relative; z-index: 2;
          display: grid;
          grid-template-columns: 380px 1fr;
          grid-template-rows: auto 1fr auto;
          min-height: 100vh;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 32px;
          gap: 0 48px;
        }
        @media (max-width: 860px) { .root { grid-template-columns: 1fr; padding: 0 20px; } }
        .header {
          grid-column: 1 / -1;
          padding: 44px 0 36px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          margin-bottom: 40px;
        }
        .wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          font-weight: 300;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--mid-brown);
          margin-bottom: 8px;
        }
        .header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 4vw, 52px);
          font-weight: 300;
          line-height: 1.06;
          color: var(--text-dark);
        }
        .header h1 em { font-style: italic; color: var(--mid-brown); }
        .header-sub {
          font-size: 13px;
          color: var(--text-light);
          font-weight: 300;
          max-width: 260px;
          text-align: right;
          line-height: 1.7;
        }
        .left-panel { display: flex; flex-direction: column; gap: 0; padding-bottom: 60px; }
        .panel-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--text-light); margin-bottom: 12px;
        }
        .drop-zone {
          position: relative;
          border-radius: 22px;
          border: 2px dashed var(--cream-deep);
          background: var(--glass);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
          aspect-ratio: 3/4;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }
        .drop-zone.has-photo { border-style: solid; border-color: var(--cream-deep); cursor: default; }
        .drop-zone.drag-over { border-color: var(--mid-brown); box-shadow: 0 0 0 4px rgba(155,112,69,0.12), var(--shadow-md); transform: scale(1.01); }
        .drop-zone:hover:not(.has-photo) { border-color: var(--light-brown); box-shadow: var(--shadow-md); }
        .drop-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 32px; text-align: center; }
        .drop-icon-ring {
          width: 60px; height: 60px; border-radius: 50%;
          border: 1.5px solid var(--cream-deep);
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,252,246,0.9);
          box-shadow: 0 2px 12px rgba(100,70,30,0.1);
        }
        .drop-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: var(--text-dark); }
        .drop-hint { font-size: 12px; color: var(--text-light); font-weight: 300; line-height: 1.6; }
        .drop-btn {
          padding: 8px 20px; border-radius: 20px;
          border: 1.5px solid var(--cream-deep);
          background: rgba(255,252,246,0.9);
          font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 500;
          color: var(--warm-brown); cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.04em;
        }
        .drop-btn:hover { background: white; border-color: var(--light-brown); }
        .photo-preview { position: absolute; inset: 0; object-fit: cover; width: 100%; height: 100%; }
        .photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(30,18,6,0.65) 0%, transparent 45%);
          display: flex; align-items: flex-end; padding: 18px; gap: 8px;
        }
        .overlay-tag {
          font-size: 11px; font-weight: 500;
          color: rgba(255,248,236,0.92);
          background: rgba(255,255,255,0.14);
          backdrop-filter: blur(8px);
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
          cursor: pointer; transition: background 0.2s;
        }
        .overlay-tag:hover { background: rgba(255,255,255,0.25); }
        .right-panel { display: flex; flex-direction: column; gap: 24px; padding-bottom: 60px; }
        .section-block { display: flex; flex-direction: column; gap: 14px; }
        .category-tabs {
          display: flex; gap: 4px; padding: 4px;
          border-radius: 14px;
          background: rgba(220,210,195,0.35);
          width: fit-content;
        }
        .cat-tab {
          padding: 7px 15px; border-radius: 11px; border: none;
          background: transparent;
          font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 500;
          letter-spacing: 0.03em; color: var(--text-mid); cursor: pointer;
          transition: all 0.2s;
        }
        .cat-tab.active { background: white; color: var(--warm-brown); box-shadow: 0 2px 8px rgba(100,70,30,0.12); }
        .chips-grid { display: flex; flex-wrap: wrap; gap: 7px; animation: chipFade 0.22s ease; }
        @keyframes chipFade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .chip {
          padding: 7px 15px; border-radius: 100px;
          border: 1.5px solid var(--border);
          background: var(--glass); backdrop-filter: blur(8px);
          font-family: 'Jost', sans-serif; font-size: 12.5px; font-weight: 400;
          color: var(--text-mid); cursor: pointer;
          transition: all 0.18s; user-select: none; letter-spacing: 0.02em;
        }
        .chip:hover:not(.active) {
          border-color: var(--light-brown); background: rgba(255,252,246,0.9);
          color: var(--warm-brown); transform: translateY(-1px); box-shadow: 0 3px 12px rgba(100,70,30,0.1);
        }
        .chip.active {
          background: var(--warm-brown); border-color: var(--warm-brown);
          color: #fdf6ec; box-shadow: 0 3px 12px rgba(107,76,42,0.28);
        }
        .chip.active:hover { background: #5a3d20; border-color: #5a3d20; transform: translateY(-1px); }
        .or-divider {
          display: flex; align-items: center; gap: 12px;
          color: var(--text-light); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .or-divider::before, .or-divider::after { content:''; flex:1; height:1px; background:var(--border); }
        .prompt-textarea {
          width: 100%; min-height: 76px; padding: 13px 15px;
          border-radius: 16px; border: 1.5px solid var(--border);
          background: var(--glass); backdrop-filter: blur(8px);
          font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 300;
          color: var(--text-dark); resize: none; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.6;
        }
        .prompt-textarea::placeholder { color: var(--text-light); }
        .prompt-textarea:focus {
          border-color: var(--light-brown);
          box-shadow: 0 0 0 3px rgba(155,112,69,0.1);
          background: rgba(255,252,246,0.92);
        }
        .prompt-preview-label {
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--text-light); margin-bottom: 7px;
        }
        .prompt-preview {
          padding: 10px 14px; border-radius: 12px;
          background: rgba(215,200,175,0.25);
          border: 1px solid rgba(180,155,110,0.2);
          font-size: 12px; color: var(--text-mid); line-height: 1.6; min-height: 38px;
        }
        .chip-inline {
          display: inline-block; padding: 2px 9px; border-radius: 20px;
          background: rgba(107,76,42,0.12); color: var(--warm-brown);
          font-size: 11px; margin: 2px 3px 2px 0;
        }
        .gen-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 15px 28px; border-radius: 16px; border: none;
          background: linear-gradient(135deg, #5c3d1e 0%, #8b6040 55%, #7a5232 100%);
          color: #fdf6ec;
          font-family: 'Jost', sans-serif; font-size: 14px; font-weight: 500;
          letter-spacing: 0.06em; cursor: pointer; transition: all 0.22s;
          box-shadow: 0 4px 20px rgba(92,61,30,0.32), 0 1px 0 rgba(255,255,255,0.12) inset;
        }
        .gen-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(92,61,30,0.4), 0 1px 0 rgba(255,255,255,0.12) inset; }
        .gen-btn:active:not(:disabled) { transform: translateY(0); }
        .gen-btn:disabled {
          background: linear-gradient(135deg, #cec4b8 0%, #ddd4c6 100%);
          color: #a89888; box-shadow: none; cursor: not-allowed;
        }
        .result-area {
          border-radius: 22px; border: 1.5px solid var(--border);
          background: var(--glass); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          overflow: hidden; aspect-ratio: 3/4;
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-sm); position: relative;
        }
        .result-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px; text-align: center; }
        .result-orb {
          width: 68px; height: 68px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--cream-mid), var(--cream-deep));
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(100,70,30,0.1);
        }
        .result-empty-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: var(--text-dark); }
        .result-empty-sub { font-size: 12px; color: var(--text-light); font-weight: 300; line-height: 1.7; max-width: 200px; }
        .result-img { width: 100%; height: 100%; object-fit: cover; display: block; animation: revealImg 0.55s cubic-bezier(0.22,1,0.36,1); }
        @keyframes revealImg { from { opacity:0; transform:scale(1.04); } to { opacity:1; transform:scale(1); } }
        .result-badge {
          position: absolute; top: 14px; right: 14px;
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px;
          background: rgba(255,252,246,0.88); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.5);
          font-size: 11px; font-weight: 500; color: var(--warm-brown);
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        .loading-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #ede4d5 25%, #e4d8c5 50%, #ede4d5 75%);
          background-size: 200% 200%;
          animation: shimmer 1.6s ease-in-out infinite;
          display: flex; align-items: center; justify-content: center;
        }
        @keyframes shimmer { 0% { background-position: 200% 200%; } 100% { background-position: -200% -200%; } }
        .spinner { border-radius: 50%; border: 2px solid rgba(107,76,42,0.18); border-top-color: var(--warm-brown); animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-pill {
          padding: 10px 14px; border-radius: 12px;
          background: rgba(220,60,40,0.07); border: 1px solid rgba(220,60,40,0.15);
          font-size: 12px; color: #8b3020;
        }
        .footer {
          grid-column: 1/-1; text-align: center; padding: 28px 0 40px;
          font-size: 11px; color: var(--text-light); font-weight: 300;
          letter-spacing: 0.04em; border-top: 1px solid var(--border);
        }
      `}</style>

      <div className="bg-layer" />
      <div className="bg-grain" />

      <div className="root">
        <header className="header">
          <div>
            <p className="wordmark">Atelier AI</p>
            <h1>
              Wear it before<br />
              <em>you buy it.</em>
            </h1>
          </div>
          <p className="header-sub">
            Upload your photo, pick a style direction, and see your look — instantly.
          </p>
        </header>

        <div className="left-panel">
          <div>
            <p className="panel-label">Your Photo</p>
            <div
              className={`drop-zone${photo ? " has-photo" : ""}${dragOver ? " drag-over" : ""}`}
              onClick={() => !photo && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="Your photo" className="photo-preview" />
                  <div className="photo-overlay">
                    <span className="overlay-tag" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Change</span>
                    <span className="overlay-tag" onClick={(e) => { e.stopPropagation(); setPhoto(null); }}>Remove</span>
                  </div>
                </>
              ) : (
                <div className="drop-empty">
                  <div className="drop-icon-ring">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9b7045" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p className="drop-title">Add your photo</p>
                  <p className="drop-hint">Full body, front-facing<br />works best</p>
                  <button className="drop-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Browse files</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="section-block">
            <p className="panel-label">Style Direction</p>
            <div className="category-tabs">
              {PROMPT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`cat-tab${activeCategory === cat.id ? " active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            <div className="chips-grid" key={activeCategory}>
              {PROMPT_CATEGORIES.find((c) => c.id === activeCategory)?.chips.map((chip) => (
                <button
                  key={chip}
                  className={`chip${selectedChips.includes(chip) ? " active" : ""}`}
                  onClick={() => toggleChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="section-block">
            <div className="or-divider">or describe your own</div>
            <textarea
              className="prompt-textarea"
              placeholder="e.g. effortless Parisian morning look with neutral tones and linen…"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {builtPrompt && (
            <div>
              <p className="prompt-preview-label">Combined prompt</p>
              <div className="prompt-preview">
                {selectedChips.map((c) => (
                  <span key={c} className="chip-inline">{c}</span>
                ))}
                {customPrompt.trim() && (
                  <span style={{ fontSize: "12px", color: "var(--text-mid)" }}>
                    {selectedChips.length > 0 ? " + " : ""}{customPrompt.trim()}
                  </span>
                )}
              </div>
            </div>
          )}

          <button className="gen-btn" onClick={generate} disabled={!canGenerate}>
            {status === "loading" ? (
              <>
                <div className="spinner" style={{ width: "15px", height: "15px", borderColor: "rgba(253,246,236,0.3)", borderTopColor: "#fdf6ec" }} />
                Generating your look…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Look
              </>
            )}
          </button>

          {status === "error" && <div className="error-pill">⚠ {errorMsg}</div>}

          <div>
            <p className="panel-label">Your Look</p>
            <div className="result-area">
              {status === "loading" && (
                <div className="loading-overlay">
                  <div className="spinner" style={{ width: "32px", height: "32px" }} />
                </div>
              )}

              {status === "done" && resultUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultUrl} alt="Generated look" className="result-img" />
                  <div className="result-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Ready
                  </div>
                </>
              ) : status !== "loading" && (
                <div className="result-empty">
                  <div className="result-orb">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b09878" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <p className="result-empty-title">Your styled look</p>
                  <p className="result-empty-sub">Add a photo and choose your style to see the magic.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="footer">
          Atelier AI · Powered by your imagination · API keys are server-side only
        </footer>
      </div>
    </>
  );
}
