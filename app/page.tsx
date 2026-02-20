"use client";
import { useState, useRef } from "react";

type UploadSlot = { file: File | null; preview: string | null };

function useSlot(): [UploadSlot, (f: File | null) => void] {
  const [slot, setSlot] = useState<UploadSlot>({ file: null, preview: null });
  const set = (f: File | null) => {
    if (!f) return setSlot({ file: null, preview: null });
    const reader = new FileReader();
    reader.onload = (e) => setSlot({ file: f, preview: e.target?.result as string });
    reader.readAsDataURL(f);
  };
  return [slot, set];
}

function UploadCard({
  label,
  sublabel,
  slot,
  onSet,
  required,
}: {
  label: string;
  sublabel?: string;
  slot: UploadSlot;
  onSet: (f: File | null) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        cursor: "pointer",
        borderRadius: "18px",
        border: slot.preview ? "2px solid #c8b89a" : "2px dashed #d4c5b0",
        background: slot.preview ? "#fff" : "rgba(255,252,248,0.7)",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
        boxShadow: slot.preview
          ? "0 4px 24px rgba(160,130,90,0.13)"
          : "0 1px 4px rgba(160,130,90,0.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "180px",
        padding: slot.preview ? "0" : "24px",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 32px rgba(160,130,90,0.18)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = slot.preview
          ? "0 4px 24px rgba(160,130,90,0.13)"
          : "0 1px 4px rgba(160,130,90,0.06)";
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onSet(e.target.files?.[0] ?? null)}
        onClick={(e) => e.stopPropagation()}
      />
      {slot.preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.preview}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent, rgba(50,35,20,0.55))",
              padding: "28px 14px 12px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#fff", fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em" }}>
              {label}
            </span>
            <span
              style={{
                color: "#fff",
                fontSize: "11px",
                background: "rgba(255,255,255,0.22)",
                borderRadius: "20px",
                padding: "2px 9px",
                backdropFilter: "blur(6px)",
              }}
            >
              Change
            </span>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e8ddd0 0%, #d4c5b0 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              boxShadow: "0 2px 8px rgba(160,130,90,0.18)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b6f4e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: "#5c4a35", textAlign: "center" }}>
            {label}
            {required && <span style={{ color: "#c8956c", marginLeft: "3px" }}>*</span>}
          </p>
          {sublabel && (
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#a08878", textAlign: "center" }}>
              {sublabel}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [personSlot, setPerson] = useSlot();
  const [topSlot, setTop] = useSlot();
  const [bottomSlot, setBottom] = useSlot();
  const [status, setStatus] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setStatus("Generating your look…");
    setResultUrl("");
    const fd = new FormData();
    if (personSlot.file) fd.append("person", personSlot.file);
    if (topSlot.file) fd.append("top", topSlot.file);
    if (bottomSlot.file) fd.append("bottom", bottomSlot.file);
    const res = await fetch("/api/tryon", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(`Error: ${data?.error ?? "unknown"}`);
      return;
    }
    setResultUrl(`/api/img?url=${encodeURIComponent(data.imageUrl)}`);
    setStatus("Done");
  }

  const canGenerate = !!personSlot.file && !!topSlot.file && !loading;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #f5f0e8;
          min-height: 100vh;
          color: #3a2e22;
        }

        .page-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 15% 10%, rgba(230,210,185,0.55) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 85% 80%, rgba(210,190,165,0.4) 0%, transparent 60%),
            #f5f0e8;
        }

        .page-noise {
          position: fixed;
          inset: 0;
          z-index: 1;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .container {
          position: relative;
          z-index: 2;
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        .header {
          text-align: center;
          margin-bottom: 48px;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a08060;
          margin-bottom: 10px;
        }

        h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 400;
          color: #2c1f10;
          line-height: 1.1;
          margin-bottom: 12px;
        }

        h1 em {
          font-style: italic;
          color: #9b6c3a;
        }

        .subtitle {
          font-size: 14px;
          color: #8a7060;
          font-weight: 400;
          max-width: 360px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .card {
          background: rgba(255, 252, 248, 0.72);
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
          border-radius: 28px;
          border: 1px solid rgba(210, 195, 175, 0.5);
          box-shadow: 0 8px 40px rgba(120, 90, 55, 0.08), 0 1px 0 rgba(255,255,255,0.8) inset;
          padding: 28px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 600px) {
          .grid { grid-template-columns: 1fr; }
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #a08060;
          margin-bottom: 14px;
        }

        .uploads-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .upload-full {
          grid-column: 1 / -1;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,180,150,0.4), transparent);
          margin: 24px 0;
        }

        .btn {
          width: 100%;
          padding: 14px 24px;
          border-radius: 14px;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #5c3d1e 0%, #8b6040 100%);
          color: #fdf6ec;
          box-shadow: 0 4px 16px rgba(92, 61, 30, 0.3), 0 1px 0 rgba(255,255,255,0.15) inset;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(92, 61, 30, 0.38), 0 1px 0 rgba(255,255,255,0.15) inset;
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          background: linear-gradient(135deg, #c5b9ac 0%, #d4c9be 100%);
          color: #a09080;
          box-shadow: none;
          cursor: not-allowed;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 13px;
          border-radius: 20px;
          background: rgba(200,185,165,0.25);
          font-size: 12px;
          color: #7a6050;
          margin-top: 12px;
        }

        .spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(139, 96, 64, 0.2);
          border-top-color: #8b6040;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .result-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 280px;
          gap: 12px;
        }

        .result-placeholder-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(200,185,165,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-img {
          width: 100%;
          border-radius: 18px;
          display: block;
          box-shadow: 0 4px 24px rgba(100,70,40,0.12);
          animation: fadeUp 0.5s ease;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .done-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #e8f5ec;
          color: #3a7a4e;
          font-size: 11px;
          font-weight: 600;
          margin-top: 10px;
        }

        .footer {
          text-align: center;
          margin-top: 32px;
          font-size: 11px;
          color: #b0a090;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="page-bg" />
      <div className="page-noise" />

      <div className="container">
        <header className="header">
          <p className="eyebrow">AI-Powered Fashion</p>
          <h1>Try it on, <em>instantly.</em></h1>
          <p className="subtitle">Upload your photo and garments — see how the look comes together before you buy.</p>
        </header>

        <div className="grid">
          {/* Left — Inputs */}
          <div className="card">
            <p className="section-label">Your Look</p>
            <div className="uploads-grid">
              <div className="upload-full">
                <UploadCard
                  label="Your Photo"
                  sublabel="Front-facing, full body"
                  slot={personSlot}
                  onSet={setPerson}
                  required
                />
              </div>
              <UploadCard
                label="Top"
                sublabel="Shirt, blouse…"
                slot={topSlot}
                onSet={setTop}
                required
              />
              <UploadCard
                label="Bottom"
                sublabel="Optional"
                slot={bottomSlot}
                onSet={setBottom}
              />
            </div>

            <div className="divider" />

            <button className="btn btn-primary" onClick={generate} disabled={!canGenerate}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate Look
                </>
              )}
            </button>

            {status && !loading && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                {status === "Done" ? (
                  <span className="done-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Look generated
                  </span>
                ) : (
                  <span className="status-pill">{status}</span>
                )}
              </div>
            )}
          </div>

          {/* Right — Result */}
          <div className="card">
            <p className="section-label">Result</p>
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt="Virtual try-on result" className="result-img" />
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b0956e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <p style={{ fontSize: "13px", color: "#b0956e", fontWeight: 500 }}>Your styled look will appear here</p>
                <p style={{ fontSize: "11px", color: "#c0a890" }}>Upload images and hit Generate</p>
              </div>
            )}
          </div>
        </div>

        <p className="footer">API keys are stored securely in server-side environment variables only.</p>
      </div>
    </>
  );
}
