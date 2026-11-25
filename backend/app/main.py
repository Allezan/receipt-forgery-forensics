"""
FastAPI Backend — Forensik Citra Struk Belanja (Kelompok 4 PCD 2026)
Siap dideploy ke Vercel (Serverless Python) maupun dijalankan lokal via Uvicorn.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.forensics import (
    analyze_receipt,
    decode_uploaded_image,
    load_config,
    load_full_metadata,
)

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config_final.json"

app = FastAPI(
    title="Receipt Forgery Forensics API",
    description="Classical OpenCV 8-stage receipt image forensics API (no deep learning / YOLO).",
    version="1.0.0",
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*").strip()
origins = (
    ["*"]
    if allowed_origins_env == "*"
    else [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "receipt-forgery-forensics-api",
        "engine": "classical-opencv-numpy",
    }


@app.get("/api/config")
def get_config() -> dict:
    return load_full_metadata(CONFIG_PATH)


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    mad_max: Optional[float] = Form(None),
    exact_min: Optional[float] = Form(None),
    ncc_raw_min: Optional[float] = Form(None),
    ignore_top_header: Optional[bool] = Form(None),
    ct_z_min: Optional[float] = Form(None),
    include_stages: bool = Form(True),
) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File harus berupa citra PNG atau JPG.",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="File gambar kosong.")
    if len(raw_bytes) > 12 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Ukuran file melebihi batas 12 MB. Unggah citra scan struk yang lebih ringkas.",
        )

    img_bgr = decode_uploaded_image(raw_bytes)
    if img_bgr is None:
        raise HTTPException(
            status_code=400,
            detail="Citra gagal didekode. Pastikan file PNG/JPG tidak rusak.",
        )

    cfg = load_config(CONFIG_PATH)
    if mad_max is not None:
        cfg["mad_max"] = float(mad_max)
    if exact_min is not None:
        cfg["exact_min"] = float(exact_min)
    if ncc_raw_min is not None:
        cfg["ncc_raw_min"] = float(ncc_raw_min)
    if ignore_top_header is not None:
        cfg["ignore_top_header"] = bool(ignore_top_header)
    if ct_z_min is not None:
        cfg["ct_z_min"] = float(ct_z_min)

    result = analyze_receipt(img_bgr, cfg=cfg, include_stages=include_stages)
    result["filename"] = file.filename or "receipt.png"
    return result

