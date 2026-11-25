# Receipt Forgery Forensics — Kelompok 4 (UAS PCD 2026)

Aplikasi web forensik citra struk belanja untuk mendeteksi manipulasi nominal menggunakan **100% Pengolahan Citra Digital (PCD) klasik** (**tanpa YOLO / Deep Learning** dan **tanpa dokumen asli pembanding**).

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS (`frontend/`)
- **Backend:** FastAPI + OpenCV + Pure NumPy 3-Class Multi-Otsu (`backend/`, dioptimalkan < 150 MB agar lolos batas Serverless Vercel 250 MB)
- **Evaluasi Notebook:** `notebooks/FINAL_UAS_PCD_Kelompok4_Forensik_Struk.ipynb`

---

## Hasil Evaluasi Resmi (Dataset *Find it! Again*, Split `test`: 218 Struk, 35 Palsu)

| Metode | Precision (%) | Recall (%) | **F1 Kelas Palsu (%)** |
|---|---:|---:|---:|
| SVM Citra (ICDAR 2023) | 30,00 | 8,57 | 13,33 |
| BoW + LR Teks (ICDAR 2023) | 40,00 | 11,43 | 17,78 |
| ChatGPT Strict (ICDAR 2023) | 14,69 | 88,57 | 25,20 |
| ChatGPT Relaxed (ICDAR 2023) | 18,33 | 62,86 | 28,39 |
| **OpenCV Klasik Final (Kelompok 4)** | **95,83** | **65,71** | **77,97** |

- **Target Utama (`Total/payment`):** Recall **`92,86%`** (`13 / 14` struk).
- **Ketahanan False Positive:** Hanya **`1 / 183`** struk asli salah tuduh (`FPR = 0,55%`).

---

## Struktur Proyek

```text
receipt-forgery-forensics/
├── backend/                     # Vercel Project #1 (FastAPI + OpenCV Klasik)
│   ├── api/index.py             # ASGI entrypoint untuk Vercel Python
│   ├── app/main.py              # Endpoint /api/health, /api/config, /api/analyze
│   ├── app/forensics.py         # Pipeline 8 tahap OpenCV + exact Pure-NumPy Multi-Otsu
│   ├── config_final.json        # Threshold terkunci hasil tuning VAL
│   ├── requirements.txt
│   └── vercel.json
├── frontend/                    # Vercel Project #2 (Next.js 15 + Tailwind CSS)
│   ├── src/app/page.tsx         # Dashboard Forensik Utama
│   ├── src/components/          # Before/After Slider, Zoom-In Proof, 8-Stage Gallery, Benchmark
│   └── .env.example
└── notebooks/                   # Notebook Google Colab Final (step-by-step)
```

---

## Menjalankan Secara Lokal

### 1. Backend (FastAPI)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Cek kesehatan API: `http://localhost:8000/api/health`

### 2. Frontend (Next.js)
```powershell
cd frontend
npm install
copy .env.example .env.local
npm run dev
```
Buka di browser: `http://localhost:3000`

---

## Panduan Deploy ke Vercel (2 Project dari 1 Repo GitHub)

### Project #1 — Deploy Backend (`FastAPI`)
1. Di dashboard Vercel, klik **Add New → Project** dan import repo `receipt-forgery-forensics`.
2. Ubah **Root Directory** menjadi **`backend`**.
3. Framework Preset biarkan **Other** (Vercel otomatis mendeteksi `api/index.py`, `requirements.txt`, dan `vercel.json`).
4. Klik **Deploy** → catat URL backend yang dihasilkan (contoh: `https://receipt-forensics-api.vercel.app`).
5. Pastikan `https://<url-backend>/api/health` mengembalikan `{"status": "ok", ...}`.

### Project #2 — Deploy Frontend (`Next.js`)
1. Klik **Add New → Project** lagi dan import repo yang sama (`receipt-forgery-forensics`).
2. Ubah **Root Directory** menjadi **`frontend`**.
3. Framework Preset otomatis **Next.js**.
4. Tambahkan **Environment Variable**:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://<url-backend-vercel-kamu>` *(tanpa garis miring `/` di akhir)*
5. Klik **Deploy**!

---

## Anggota Kelompok 4 (PCD 2026)
- Imanuel Carlos Lumban Tobing (`2310511143`)
- Abdul Faris Aufar (`2310511154`)
- Muhammad Ammar Allezandro Djosan (`2310511128`)
- **Dosen Pengampu:** Dr. Mayanda Mega Santoni, S.Komp, M.Kom.

