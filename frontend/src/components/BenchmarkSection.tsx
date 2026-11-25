"use client";

const BENCHMARKS = [
  { name: "SVM Citra (ICDAR 2023)", prec: 30.0, rec: 8.57, f1: 13.33, ours: false },
  { name: "BoW + LR Teks (ICDAR 2023)", prec: 40.0, rec: 11.43, f1: 17.78, ours: false },
  { name: "ChatGPT Strict (ICDAR 2023)", prec: 14.69, rec: 88.57, f1: 25.2, ours: false },
  { name: "ChatGPT Relaxed (ICDAR 2023)", prec: 18.33, rec: 62.86, f1: 28.39, ours: false },
  { name: "OpenCV Klasik Final (Kelompok 4)", prec: 95.83, rec: 65.71, f1: 77.97, ours: true },
];

const BY_TECH = [
  { tech: "CPI (Copy-Paste Internal)", receipts: 27, recall: 77.78, overlap: 64.47 },
  { tech: "IMI (Ketik Ulang Digital)", receipts: 3, recall: 66.67, overlap: 42.86 },
  { tech: "PIX (Modifikasi Piksel)", receipts: 3, recall: 66.67, overlap: 0.0 },
  { tech: "CUT (Penghapusan)", receipts: 5, recall: 40.0, overlap: 33.33 },
  { tech: "CPO (Salin Struk Lain)", receipts: 2, recall: 0.0, overlap: 0.0 },
];

const BY_ENTITY = [
  { entity: "Total/payment", receipts: 14, areas: 40, recall: 92.86, iou: 0.2748 },
  { entity: "Product", receipts: 15, areas: 29, recall: 80.0, iou: 0.2572 },
  { entity: "Metadata", receipts: 15, areas: 22, recall: 60.0, iou: 0.165 },
  { entity: "Company", receipts: 5, areas: 10, recall: 60.0, iou: 0.3167 },
];

export default function BenchmarkSection() {
  return (
    <section id="benchmark" className="border-t border-neutral-900 bg-white">
      {/* Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 bg-[#FAFAF8] px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs font-bold text-[#1D4ED8]">
            SEC.02
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-950">
            Official Held-Out Evaluation — Find it! Again (Split TEST · N = 218)
          </h2>
        </div>
        <span className="font-mono text-[11px] text-neutral-500">
          VAL-TUNED THRESHOLD · ZERO DEEP LEARNING · ZERO DATA LEAKAGE
        </span>
      </div>

      {/* Top Row: F1 Comparison + Confusion Matrix */}
      <div className="grid grid-cols-1 divide-y divide-neutral-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        <div className="p-6 lg:col-span-8">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            F1-SCORE KELAS PALSU VS BASELINE ICDAR 2023
          </div>
          <div className="space-y-4">
            {BENCHMARKS.map((b) => (
              <div key={b.name} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <span
                    className={
                      b.ours
                        ? "font-bold text-[#B42318]"
                        : "text-neutral-600"
                    }
                  >
                    {b.ours && (
                      <span className="mr-1.5 inline-block h-2 w-2 bg-[#D92D20] align-middle" />
                    )}
                    {b.name}
                  </span>
                  <span className="font-mono tabular-nums text-neutral-950">
                    <strong className={b.ours ? "text-[#D92D20]" : ""}>
                      {b.f1.toFixed(2)}%
                    </strong>{" "}
                    <span className="text-neutral-400">
                      (P {b.prec.toFixed(1)} · R {b.rec.toFixed(1)})
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-neutral-100">
                  <div
                    className={`h-full ${
                      b.ours ? "bg-[#D92D20]" : "bg-neutral-300"
                    }`}
                    style={{ width: `${b.f1}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confusion Matrix with crisp semantic coding */}
        <div className="p-6 lg:col-span-4">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            CONFUSION MATRIX (35 PALSU / 183 ASLI)
          </div>
          <div className="grid grid-cols-2 border border-neutral-900 font-mono">
            <div className="border-b border-r border-neutral-200 bg-[#F2FBF6] p-4">
              <div className="text-[10px] font-semibold text-[#047857]">
                TN · ASLI→ASLI
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-[#065F46]">
                182
              </div>
            </div>
            <div className="border-b border-neutral-200 bg-[#FFFBEB] p-4">
              <div className="text-[10px] font-semibold text-[#B45309]">
                FP · ASLI→PALSU
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-[#D97706]">
                1
              </div>
            </div>
            <div className="border-r border-neutral-200 bg-neutral-50 p-4">
              <div className="text-[10px] text-neutral-500">
                FN · PALSU→ASLI
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-600">
                12
              </div>
            </div>
            <div className="bg-[#D92D20] p-4 text-white">
              <div className="text-[10px] text-red-100">TP · PALSU→PALSU</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">23</div>
            </div>
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-neutral-600">
            Precision = <strong className="text-[#047857]">95.83%</strong> · FPR
            = 0.55% (1/183). Header digital = 0 FP (0/11).
          </p>
        </div>
      </div>

      {/* Bottom Row: Technique & Entity Slices */}
      <div className="grid grid-cols-1 divide-y divide-neutral-200 border-t border-neutral-200 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            RECALL PER TEKNIK PEMALSUAN
          </div>
          <table className="w-full text-left font-mono text-xs tabular-nums">
            <thead className="border-b border-neutral-900 text-[10px] uppercase text-neutral-500">
              <tr>
                <th className="py-2">TEKNIK</th>
                <th className="py-2 text-right">N</th>
                <th className="py-2 text-right">RECALL</th>
                <th className="py-2 text-right">OVERLAP≥0.1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {BY_TECH.map((t) => {
                const isCpi = t.tech.startsWith("CPI");
                return (
                  <tr
                    key={t.tech}
                    className={isCpi ? "bg-[#EFF6FF]/60" : undefined}
                  >
                    <td className="py-2 font-sans font-medium text-neutral-800">
                      {t.tech}
                    </td>
                    <td className="py-2 text-right text-neutral-500">
                      {t.receipts}
                    </td>
                    <td
                      className={`py-2 text-right font-bold ${
                        isCpi ? "text-[#1D4ED8]" : "text-neutral-950"
                      }`}
                    >
                      {t.recall.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-neutral-600">
                      {t.overlap.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            RECALL PER JENIS ISI (TARGET UTAMA: TOTAL/PAYMENT)
          </div>
          <table className="w-full text-left font-mono text-xs tabular-nums">
            <thead className="border-b border-neutral-900 text-[10px] uppercase text-neutral-500">
              <tr>
                <th className="py-2">ENTITAS</th>
                <th className="py-2 text-right">STRUK</th>
                <th className="py-2 text-right">RECALL</th>
                <th className="py-2 text-right">MEAN IOU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {BY_ENTITY.map((e) => {
                const isTotal = e.entity === "Total/payment";
                return (
                  <tr
                    key={e.entity}
                    className={isTotal ? "bg-[#FFF5F5]" : undefined}
                  >
                    <td className="py-2 font-sans font-semibold text-neutral-950">
                      {e.entity}
                    </td>
                    <td className="py-2 text-right text-neutral-500">
                      {e.receipts}
                    </td>
                    <td
                      className={`py-2 text-right font-bold ${
                        isTotal ? "text-[#D92D20]" : "text-neutral-950"
                      }`}
                    >
                      {e.recall.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-neutral-600">
                      {e.iou.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Colophon Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-900 bg-[#FAFAF8] px-6 py-4 font-mono text-[11px] text-neutral-600">
        <div>
          <span className="font-bold text-neutral-950">
            KELOMPOK 4 · PCD 2026
          </span>
          {" — "}Imanuel Carlos L.T. (2310511143) · Abdul Faris Aufar
          (2310511154) · M. Ammar Allezandro D. (2310511128)
        </div>
        <div>
          DOSEN:{" "}
          <span className="font-medium text-neutral-950">
            Dr. Mayanda Mega Santoni, S.Komp, M.Kom.
          </span>
        </div>
      </footer>
    </section>
  );
}
