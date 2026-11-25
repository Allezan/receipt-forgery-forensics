"use client";

import { useEffect, useRef, useState } from "react";

import BenchmarkSection from "@/components/BenchmarkSection";
import EvidenceRail from "@/components/EvidenceRail";
import SpecimenViewport from "@/components/SpecimenViewport";
import { AnalysisResponse } from "@/types/forensics";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  // Calibration controls (default = konfigurasi final terkunci VAL)
  const [showCalib, setShowCalib] = useState(false);
  const [madMax, setMadMax] = useState(4.5);
  const [exactMin, setExactMin] = useState(0.65);
  const [nccRawMin, setNccRawMin] = useState(0.92);
  const [ignoreTopHeader, setIgnoreTopHeader] = useState(true);
  const [enableClearType, setEnableClearType] = useState(true);
  const [ctZMin, setCtZMin] = useState(12.0);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/api/health`)
      .then((res) => {
        if (active) setApiStatus(res.ok ? "online" : "offline");
      })
      .catch(() => {
        if (active) setApiStatus("offline");
      });
    return () => {
      active = false;
    };
  }, []);

  const handleFilePick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Format ditolak: unggah file citra PNG atau JPG.");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const resetCalibration = () => {
    setMadMax(4.5);
    setExactMin(0.65);
    setNccRawMin(0.92);
    setIgnoreTopHeader(true);
    setEnableClearType(true);
    setCtZMin(12.0);
  };

  const runAnalysis = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("mad_max", String(madMax));
      fd.append("exact_min", String(exactMin));
      fd.append("ncc_raw_min", String(nccRawMin));
      fd.append("ignore_top_header", String(ignoreTopHeader));
      fd.append("ct_z_min", String(enableClearType ? ctZMin : 999.0));
      fd.append("include_stages", "true");

      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || `HTTP ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi API.";
      setErrorMsg(`${msg} (Endpoint: ${API_BASE})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      {/* Top Instrument Header Bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-neutral-900 bg-white px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="bg-neutral-950 px-2 py-0.5 font-mono text-[11px] font-bold tracking-widest text-white">
            PCD.LAB/04
          </span>
          <h1 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            Forensik Citra Struk Belanja
          </h1>
        </div>

        <div className="flex items-center gap-5 font-mono text-[11px]">
          <span className="hidden text-neutral-500 md:inline">
            OPENCV KLASIK · TANPA DEEP LEARNING
          </span>
          <a
            href="#benchmark"
            className="font-semibold text-[#1D4ED8] underline-offset-4 hover:underline"
          >
            BENCHMARK · F1 77.97%
          </a>
          <span
            className={`inline-flex items-center gap-1.5 font-semibold ${
              apiStatus === "online"
                ? "text-[#047857]"
                : apiStatus === "offline"
                ? "text-[#D92D20]"
                : "text-neutral-400"
            }`}
          >
            <span
              className={`h-2 w-2 ${
                apiStatus === "online"
                  ? "bg-[#10B981]"
                  : apiStatus === "offline"
                  ? "bg-[#D92D20]"
                  : "bg-neutral-300"
              }`}
            />
            API:{apiStatus.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Split-Pane Workstation */}
      <main className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT 7 COLS: SPECIMEN INSPECTION CANVAS */}
        <div className="border-b border-neutral-900 lg:col-span-7 lg:border-b-0 lg:border-r lg:border-neutral-900">
          {result ? (
            <SpecimenViewport
              stages={result.stages}
              summary={result.summary}
              filename={result.filename}
            />
          ) : (
            <div className="lab-grid-bg flex min-h-[600px] flex-col items-center justify-center p-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilePick(e.dataTransfer.files?.[0] ?? null);
                }}
                className="flex w-full max-w-lg cursor-pointer flex-col items-center border border-dashed border-neutral-900 bg-white p-10 text-center transition-colors hover:border-[#1D4ED8] hover:bg-[#EFF6FF]/30"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#1D4ED8]">
                  SEC.01 · SPECIMEN INPUT
                </span>

                {previewUrl && selectedFile ? (
                  <div className="my-5 space-y-3">
                    <div className="border border-neutral-300 bg-neutral-50 p-2">
                      <img
                        src={previewUrl}
                        alt="Selected specimen"
                        className="mx-auto max-h-72 w-auto object-contain"
                      />
                    </div>
                    <div className="font-mono text-xs font-semibold text-neutral-950">
                      {selectedFile.name}
                    </div>
                    <div className="font-mono text-[11px] text-neutral-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Klik untuk
                      mengganti file
                    </div>
                  </div>
                ) : (
                  <div className="my-8 space-y-2">
                    <p className="text-base font-bold tracking-tight text-neutral-950">
                      Seret atau pilih citra scan struk belanja
                    </p>
                    <p className="font-mono text-xs text-neutral-500">
                      FORMAT: .PNG (LOSSLESS DISARANKAN) / .JPG
                    </p>
                    <p className="pt-2 text-xs text-neutral-500">
                      Lingkup: citra dokumen hasil scan (seperti dataset{" "}
                      <em>Find it! Again</em>). Foto kamera HP di luar lingkup.
                    </p>
                  </div>
                )}

                <span className="border border-[#1D4ED8] bg-[#EFF6FF] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  {selectedFile ? "GANTI FILE" : "PILIH FILE STRUK"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: CONTROL & FORENSIC DOSSIER RAIL */}
        <aside className="flex flex-col divide-y divide-neutral-200 bg-white lg:col-span-5">
          {/* Action & Specimen Bar */}
          <div className="p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
            />

            <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              <span>00 · INSTRUMENT CONTROL</span>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold text-[#1D4ED8] underline underline-offset-4"
                >
                  GANTI STRUK
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!selectedFile || loading}
                onClick={runAnalysis}
                className="flex-1 bg-[#1D4ED8] px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {loading
                  ? "MEMPROSES 8 TAHAP OPENCV..."
                  : result
                  ? "ANALISIS ULANG"
                  : "JALANKAN FORENSIK 8 TAHAP"}
              </button>

              <button
                type="button"
                onClick={() => setShowCalib((v) => !v)}
                className={`border px-3.5 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
                  showCalib
                    ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950"
                }`}
              >
                CALIB
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 border-l-4 border-[#D92D20] bg-[#FFF5F5] px-3 py-2 font-mono text-[11px] text-[#B42318]">
                ERROR: {errorMsg}
              </div>
            )}

            {/* Collapsible Calibration Parameters */}
            {showCalib && (
              <div className="mt-4 space-y-3 border border-neutral-200 bg-[#FAFAF8] p-4 font-mono text-[11px]">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="font-semibold text-neutral-950">
                    THRESHOLD CALIBRATION
                  </span>
                  <button
                    type="button"
                    onClick={resetCalibration}
                    className="font-semibold text-[#1D4ED8] underline underline-offset-2"
                  >
                    RESET LOCKED
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">MAX MAD NON-WHITE</span>
                    <span className="font-semibold tabular-nums text-[#B42318]">
                      {madMax}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={madMax}
                    onChange={(e) => setMadMax(Number(e.target.value))}
                    className="mono-range w-full"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">MIN EXACT PIXELS</span>
                    <span className="font-semibold tabular-nums text-[#B45309]">
                      {(exactMin * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={0.99}
                    step={0.01}
                    value={exactMin}
                    onChange={(e) => setExactMin(Number(e.target.value))}
                    className="mono-range w-full"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">MIN NCC PATCH</span>
                    <span className="font-semibold tabular-nums text-[#1D4ED8]">
                      {nccRawMin.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={0.99}
                    step={0.01}
                    value={nccRawMin}
                    onChange={(e) => setNccRawMin(Number(e.target.value))}
                    className="mono-range w-full"
                  />
                </label>

                <div className="space-y-1.5 pt-1 text-neutral-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ignoreTopHeader}
                      onChange={(e) => setIgnoreTopHeader(e.target.checked)}
                      className="accent-[#1D4ED8]"
                    />
                    <span>ABAIKAN HEADER 10% TERATAS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableClearType}
                      onChange={(e) => setEnableClearType(e.target.checked)}
                      className="accent-[#7C3AED]"
                    />
                    <span>CLEARTYPE ANOMALY (Z ≥ {ctZMin})</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Evidence Dossier OR Idle Specification Sheet */}
          {result ? (
            <EvidenceRail result={result} />
          ) : (
            <div className="divide-y divide-neutral-200">
              <div className="p-5">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  01 · PIPELINE ARCHITECTURE (8 STAGES)
                </div>
                <ol className="space-y-2 font-mono text-xs text-neutral-700">
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#1D4ED8]">01</span>
                    <span>Input Resolusi Asli (Tanpa Resize)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#1D4ED8]">02</span>
                    <span>Grayscale + CLAHE (Kontras Lokal)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#1D4ED8]">03</span>
                    <span>Sisa Warna RGB − μ (Chromatic Artifact)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#1D4ED8]">04</span>
                    <span>Residu Noise |Gray − Median 3×3|</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#1D4ED8]">05</span>
                    <span>Multi-Otsu 3-Kelas (th[1]) + Adaptive + CC #1</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#1D4ED8]">06</span>
                    <span>Opening + Dilasi Horizontal + CC #2 (Non-NN)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#D92D20]">07</span>
                    <span>Deteksi CPI (MAD/Identik/NCC) &amp; IMI (ClearType)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#D92D20]">08</span>
                    <span>Keputusan + Lokalisasi Kotak Merah</span>
                  </li>
                </ol>
              </div>

              <div className="p-5">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  02 · LOCKED EVALUATION SUMMARY (SPLIT TEST)
                </div>
                <div className="grid grid-cols-2 border border-neutral-300 font-mono text-xs tabular-nums">
                  <div className="border-b border-r border-neutral-200 bg-[#FFF5F5] p-3">
                    <div className="text-[10px] text-neutral-500">TEST F1</div>
                    <div className="text-base font-bold text-[#D92D20]">
                      77.97%
                    </div>
                  </div>
                  <div className="border-b border-neutral-200 bg-[#F2FBF6] p-3">
                    <div className="text-[10px] text-neutral-500">
                      PRECISION
                    </div>
                    <div className="text-base font-bold text-[#047857]">
                      95.83%
                    </div>
                  </div>
                  <div className="border-r border-neutral-200 p-3">
                    <div className="text-[10px] text-neutral-500">RECALL</div>
                    <div className="text-base font-bold text-[#1D4ED8]">
                      65.71%
                    </div>
                  </div>
                  <div className="bg-[#FFF5F5] p-3">
                    <div className="text-[10px] text-neutral-500">
                      TOTAL/PAY
                    </div>
                    <div className="text-base font-bold text-[#B42318]">
                      92.86%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Lower Full-Width Benchmark Section */}
      <BenchmarkSection />
    </div>
  );
}
