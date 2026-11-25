"use client";

import { useState } from "react";
import { AnalysisResponse } from "@/types/forensics";

interface Props {
  result: AnalysisResponse;
}

export default function EvidenceRail({ result }: Props) {
  const [showAllCpi, setShowAllCpi] = useState(false);
  const isForged = result.pred === 1;
  const { summary, top_cpi_crops, cpi_pairs, imi_hits } = result;

  return (
    <div className="divide-y divide-neutral-200">
      {/* 01 · VERDICT (High-Signal Semantic Highlight) */}
      <section className={isForged ? "bg-[#FFF5F5] p-5" : "bg-[#F2FBF6] p-5"}>
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span>01 · CASE VERDICT</span>
          <span className="tabular-nums font-medium text-neutral-700">
            {(summary.elapsed_ms / 1000).toFixed(2)}S CPU
          </span>
        </div>

        <div
          className={`border-l-4 pl-4 ${
            isForged ? "border-[#D92D20]" : "border-[#059669]"
          }`}
        >
          <span
            className={`inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white ${
              isForged ? "bg-[#D92D20]" : "bg-[#059669]"
            }`}
          >
            {isForged ? "! MANIPULATION INDICATED" : "✓ AUTHENTIC / CLEAN"}
          </span>
          <h2
            className={`mt-2 text-lg font-bold tracking-tight ${
              isForged ? "text-[#7A271A]" : "text-[#065F46]"
            }`}
          >
            {result.verdict}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700">
            {isForged
              ? `Teridentifikasi ${summary.n_cpi_pairs} pasangan salinan piksel identik (CPI) dan ${summary.n_imi_hits} karakter anomali ClearType (IMI).`
              : "Tidak ditemukan pasangan karakter copy-paste identik maupun anomali pinggiran ClearType di atas ambang batas terkunci."}
          </p>
        </div>

        {/* 1px Telemetry Matrix */}
        <div className="mt-4 grid grid-cols-2 border border-neutral-300 bg-white font-mono text-xs">
          <div className="border-b border-r border-neutral-200 p-2.5">
            <div className="text-[10px] uppercase text-neutral-400">
              COLOR MODE
            </div>
            <div className="mt-0.5 font-semibold text-neutral-950">
              {summary.is_color ? "RGB (3-CH)" : "GRAYSCALE"}
            </div>
          </div>
          <div className="border-b border-neutral-200 p-2.5">
            <div className="text-[10px] uppercase text-neutral-400">
              OTSU TH [0, 1]
            </div>
            <div className="mt-0.5 tabular-nums font-semibold text-neutral-950">
              [{summary.multiotsu_thresholds.join(", ")}]
            </div>
          </div>
          <div className="border-r border-neutral-200 p-2.5">
            <div className="text-[10px] uppercase text-neutral-400">
              CHARS / BLOCKS
            </div>
            <div className="mt-0.5 tabular-nums font-semibold text-neutral-950">
              {summary.n_chars} / {summary.n_words}
            </div>
          </div>
          <div
            className={`p-2.5 ${
              isForged ? "bg-[#FEE4E2]/60" : "bg-[#D1FAE5]/50"
            }`}
          >
            <div className="text-[10px] uppercase text-neutral-500">
              EVIDENCE (CPI/IMI)
            </div>
            <div
              className={`mt-0.5 tabular-nums font-bold ${
                isForged ? "text-[#B42318]" : "text-[#047857]"
              }`}
            >
              {summary.n_cpi_pairs} / {summary.n_imi_hits}
            </div>
          </div>
        </div>
      </section>

      {/* 02 · COPY-PASTE MICROSCOPY (CPI) */}
      <section className="p-5">
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#D92D20]" />
            02 · COPY-PASTE MICROSCOPY (CPI)
          </span>
          <span
            className={`px-1.5 py-0.5 tabular-nums font-bold ${
              cpi_pairs.length > 0
                ? "bg-[#FEE4E2] text-[#B42318]"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            N = {cpi_pairs.length}
          </span>
        </div>

        {top_cpi_crops.length === 0 ? (
          <p className="font-mono text-xs text-neutral-500">
            — 0 pasangan memenuhi syarat MAD ≤ {result.config_used.mad_max} &amp;
            Identik ≥ {(result.config_used.exact_min * 100).toFixed(0)}%.
          </p>
        ) : (
          <div className="space-y-3">
            {top_cpi_crops.map((crop, idx) => (
              <div key={idx} className="border border-neutral-300 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-neutral-200 bg-[#FAFAF8] px-3 py-1.5 font-mono text-[11px]">
                  <span className="font-bold text-[#B42318]">
                    PAIR #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-wrap gap-1 tabular-nums text-[10px]">
                    <span className="bg-[#FEE4E2] px-1.5 py-0.5 font-semibold text-[#B42318]">
                      MAD {crop.mad_nw.toFixed(2)}
                    </span>
                    <span className="bg-[#FEF3C7] px-1.5 py-0.5 font-semibold text-[#B45309]">
                      EX {(crop.exact_nw * 100).toFixed(1)}%
                    </span>
                    <span className="bg-[#DBEAFE] px-1.5 py-0.5 font-semibold text-[#1D4ED8]">
                      NCC {crop.ncc_raw.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-neutral-200">
                  <div className="p-2 text-center">
                    <div className="flex h-20 items-center justify-center bg-neutral-50">
                      <img
                        src={crop.patch1_uri}
                        alt={`P1 ${idx}`}
                        className="pixelated max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] tabular-nums text-neutral-500">
                      P1 ({crop.bbox1[0]},{crop.bbox1[1]})
                    </div>
                  </div>
                  <div className="p-2 text-center">
                    <div className="flex h-20 items-center justify-center bg-neutral-50">
                      <img
                        src={crop.patch2_uri}
                        alt={`P2 ${idx}`}
                        className="pixelated max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] tabular-nums text-neutral-500">
                      P2 ({crop.bbox2[0]},{crop.bbox2[1]})
                    </div>
                  </div>
                  <div className="p-2 text-center">
                    <div className="flex h-20 items-center justify-center bg-neutral-950">
                      <img
                        src={crop.diff_uri}
                        alt={`Diff ${idx}`}
                        className="pixelated max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-neutral-600">
                      |P1 − P2|
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {cpi_pairs.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowAllCpi((v) => !v)}
                  className="font-mono text-[11px] font-semibold text-[#1D4ED8] underline underline-offset-4"
                >
                  {showAllCpi
                    ? "SEMBUNYIKAN TABEL KOORDINAT ▲"
                    : `LIHAT SEMUA ${cpi_pairs.length} PASANGAN CPI ▼`}
                </button>
                {showAllCpi && (
                  <div className="mt-2 max-h-52 overflow-auto border border-neutral-200">
                    <table className="w-full text-left font-mono text-[11px] tabular-nums">
                      <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                        <tr>
                          <th className="px-2 py-1.5">#</th>
                          <th className="px-2 py-1.5">MAD</th>
                          <th className="px-2 py-1.5">IDENTIK</th>
                          <th className="px-2 py-1.5">NCC</th>
                          <th className="px-2 py-1.5">DIST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {cpi_pairs.map((p, i) => (
                          <tr key={i} className="hover:bg-neutral-50">
                            <td className="px-2 py-1 text-neutral-400">
                              {i + 1}
                            </td>
                            <td className="px-2 py-1 font-semibold text-[#B42318]">
                              {p.mad_nw.toFixed(3)}
                            </td>
                            <td className="px-2 py-1 font-medium text-[#B45309]">
                              {(p.exact_nw * 100).toFixed(1)}%
                            </td>
                            <td className="px-2 py-1 text-[#1D4ED8]">
                              {p.ncc_raw.toFixed(3)}
                            </td>
                            <td className="px-2 py-1">{p.dist}px</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 03 · DIGITAL INSERTION (IMI / CLEARTYPE) */}
      <section className="p-5">
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#7C3AED]" />
            03 · DIGITAL INSERTION (IMI)
          </span>
          <span
            className={`px-1.5 py-0.5 tabular-nums font-bold ${
              imi_hits.length > 0
                ? "bg-[#F3E8FF] text-[#6D28D9]"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            N = {imi_hits.length}
          </span>
        </div>

        {imi_hits.length === 0 ? (
          <p className="font-mono text-xs text-neutral-500">
            — 0 karakter anomali ClearType (z ≥ {result.config_used.ct_z_min}).
          </p>
        ) : (
          <div className="max-h-48 overflow-auto border border-neutral-200">
            <table className="w-full text-left font-mono text-[11px] tabular-nums">
              <thead className="border-b border-neutral-200 bg-[#F5F3FF] text-[#5B21B6]">
                <tr>
                  <th className="px-2.5 py-1.5">BBOX</th>
                  <th className="px-2.5 py-1.5 text-right">FRINGE</th>
                  <th className="px-2.5 py-1.5 text-right">CORE</th>
                  <th className="px-2.5 py-1.5 text-right">Z-SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {imi_hits.map((h, i) => (
                  <tr key={i}>
                    <td className="px-2.5 py-1.5">[{h.bbox.join(",")}]</td>
                    <td className="px-2.5 py-1.5 text-right">
                      {h.ct_diff ?? "-"}
                    </td>
                    <td className="px-2.5 py-1.5 text-right">
                      {h.core_chroma ?? "-"}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-bold text-[#6D28D9]">
                      {h.robust_z ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
