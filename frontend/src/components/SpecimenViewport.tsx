"use client";

import { useState } from "react";
import { ForensicStages, ForensicSummary } from "@/types/forensics";

export type LayerKey = "split" | keyof ForensicStages;

interface Props {
  stages: ForensicStages;
  summary: ForensicSummary;
  filename: string;
}

interface LayerSpec {
  id: LayerKey;
  code: string;
  label: string;
  formula: string;
  note: string;
}

export default function SpecimenViewport({ stages, summary, filename }: Props) {
  const [layer, setLayer] = useState<LayerKey>("result");
  const [splitPos, setSplitPos] = useState<number>(50);

  const layers: LayerSpec[] = [
    {
      id: "result",
      code: "08",
      label: "RESULT",
      formula: `CPI=${summary.n_cpi_pairs} PAIRS · IMI=${summary.n_imi_hits} HITS`,
      note: "Kotak merah menandai kandidat Copy-Paste (CPI), garis oranye menghubungkan pasangan kembar, kotak ungu menandai anomali ClearType (IMI).",
    },
    {
      id: "split",
      code: "⇄",
      label: "BEFORE/AFTER",
      formula: "INTERACTIVE CURTAIN · INPUT (LEFT) vs DETECTED (RIGHT)",
      note: "Geser garis vertikal untuk membandingkan langsung citra asli polos dengan area yang ditandai sistem.",
    },
    {
      id: "input",
      code: "01",
      label: "INPUT",
      formula: `${summary.width}×${summary.height}PX · ${summary.color_label.toUpperCase()} · NO RESIZE`,
      note: "Citra dibaca dalam resolusi asli agar pola bintik scanner dan kemiripan bit-per-bit lossless PNG tidak rusak.",
    },
    {
      id: "clahe",
      code: "02",
      label: "CLAHE",
      formula: "BGR2GRAY → CLAHE(clipLimit=2.0, grid=8×8)",
      note: "Meratakan kontras lokal kertas struk yang pudar/tidak merata tanpa memperkuat noise latar secara berlebihan.",
    },
    {
      id: "chroma",
      code: "03",
      label: "CHROMA",
      formula: "||RGB − mean(R,G,B)||₂  [Gardella et al., ICCVW 2025]",
      note: "Membuang komponen abu-abu sehingga hanya bias warna lensa scanner atau pinggiran oranye-biru ClearType yang menyala.",
    },
    {
      id: "noise",
      code: "04",
      label: "NOISE",
      formula: "|Gray − MedianBlur(3×3)|",
      note: "Meredam struktur huruf dan mengekstrak residu bintik halus sebagai sidik jari sensor scanner.",
    },
    {
      id: "mask",
      code: "05",
      label: "OTSU+OPEN",
      formula: `MultiOtsu3(th=${summary.multiotsu_thresholds.join(",")}) ∩ AdaptiveGaussian → Open(2×2)`,
      note: "Menggunakan batas th[1] agar tinta struk pudar tetap tertangkap bersama tinta pekat, lalu membuang bintik debu.",
    },
    {
      id: "cc",
      code: "05B",
      label: "CHARS (CC)",
      formula: `ConnectedComponents(8-conn) → ${summary.n_chars} ISOLATED CHARACTERS`,
      note: "Setiap karakter dipotong menjadi objek independen agar manipulasi 1 digit saja tetap terdeteksi.",
    },
    {
      id: "words",
      code: "06",
      label: "WORDS",
      formula: `HorizontalDilation + CC#2 → ${summary.n_words} WORD BLOCKS (NON-NN)`,
      note: "Menyatukan karakter berdekatan menjadi blok nominal utuh murni dengan morfologi klasik sebagai pengganti detektor EAST.",
    },
  ];

  const activeSpec = layers.find((l) => l.id === layer) ?? layers[0];

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = stages.result;
    const stem = filename.replace(/\.[^/.]+$/, "");
    a.download = `forensic_${stem}.jpg`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Layer Switcher Strip */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-200 bg-white">
        <div className="flex flex-wrap">
          {layers.map((item) => {
            const isAct = layer === item.id;
            const isHighlightTab = item.id === "result" || item.id === "split";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLayer(item.id)}
                className={`border-r border-neutral-200 px-3 py-2.5 font-mono text-[11px] tracking-tight transition-colors ${
                  isAct
                    ? isHighlightTab
                      ? "bg-[#1D4ED8] text-white"
                      : "bg-neutral-950 text-white"
                    : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                }`}
              >
                <span
                  className={
                    isAct
                      ? isHighlightTab
                        ? "text-blue-200"
                        : "text-neutral-400"
                      : "text-neutral-400"
                  }
                >
                  {item.code}{" "}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-[#1D4ED8] underline-offset-4 hover:bg-blue-50 hover:underline"
        >
          EXPORT JPG ↗
        </button>
      </div>

      {/* Crisp Color Legend Strip */}
      <div className="flex flex-wrap items-center gap-5 border-b border-neutral-200 bg-[#FAFAF8] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-[#D92D20]" />
          MERAH: COPY-PASTE (CPI)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#D97706]" />
          ORANYE: GARIS PASANGAN
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-[#7C3AED]" />
          UNGU: CLEARTYPE (IMI)
        </span>
      </div>

      {/* Main Inspection Canvas */}
      <div className="lab-grid-bg relative flex min-h-[540px] flex-1 flex-col items-center justify-center p-6">
        <span className="pointer-events-none absolute left-3 top-2.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          SPECIMEN // {filename}
        </span>
        <span className="pointer-events-none absolute right-3 top-2.5 font-mono text-[10px] tabular-nums text-neutral-500">
          {summary.width} × {summary.height} PX
        </span>

        {layer === "split" ? (
          <div className="w-full max-w-xl space-y-3">
            <div className="flex items-center justify-between font-mono text-[11px] text-neutral-600">
              <span>BEFORE (RAW)</span>
              <span className="tabular-nums font-semibold text-[#1D4ED8]">
                SPLIT {splitPos}%
              </span>
              <span>AFTER (DETECTED)</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={splitPos}
              onChange={(e) => setSplitPos(Number(e.target.value))}
              className="mono-range w-full"
            />
            <div className="relative mx-auto flex justify-center overflow-hidden border border-neutral-900 bg-white">
              <img
                src={stages.result}
                alt="After detection"
                className="block max-h-[600px] w-auto select-none object-contain"
              />
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
              >
                <img
                  src={stages.input}
                  alt="Before original"
                  className="mx-auto block max-h-[600px] w-auto select-none object-contain"
                />
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 w-[2px] bg-[#D92D20]"
                style={{ left: `${splitPos}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="border border-neutral-300 bg-white p-1.5">
            <img
              src={stages[layer]}
              alt={activeSpec.label}
              className="max-h-[620px] w-auto object-contain"
            />
          </div>
        )}
      </div>

      {/* Stage Technical Readout Bar */}
      <div className="border-t border-neutral-200 bg-white px-5 py-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
            STAGE {activeSpec.code} · {activeSpec.label}
          </span>
          <span className="font-mono text-[11px] text-neutral-600">
            {activeSpec.formula}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          {activeSpec.note}
        </p>
      </div>
    </div>
  );
}
