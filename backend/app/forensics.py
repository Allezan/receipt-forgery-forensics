"""
Mesin Forensik Citra Struk Belanja (100% OpenCV Klasik + Pure NumPy).
Dioptimalkan untuk deployment Vercel Serverless (< 150 MB tanpa SciPy / scikit-image)
dengan hasil matematis 100% identik terhadap Notebook Final (F1 Test = 77.97%).
"""

from __future__ import annotations

import base64
import json
import math
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import cv2
import numpy as np


DEFAULT_CONFIG: dict[str, Any] = {
    "mad_max": 4.5,
    "exact_min": 0.65,
    "ncc_raw_min": 0.92,
    "min_nw_pixels": 30,
    "ignore_top_header": True,
    "ignore_same_line_close": False,
    "ct_z_min": 12.0,
    "ct_diff_min": 10.0,
    "ct_min_chars": 2,
    "use_nfa": False,
    "nfa_max": 0.001,
}

# Konstanta eksak scipy.stats.norm.ppf(0.90) untuk alpha = 0.10
Z_ALPHA_010 = 1.2815515655446004


def load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    cfg = DEFAULT_CONFIG.copy()
    if config_path is not None:
        p = Path(config_path)
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            loaded = data.get("best_cfg", data)
            if isinstance(loaded, dict):
                cfg.update(loaded)
    return cfg


def load_full_metadata(config_path: str | Path | None = None) -> dict[str, Any]:
    if config_path is not None:
        p = Path(config_path)
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return {"best_cfg": DEFAULT_CONFIG.copy()}


def decode_uploaded_image(file_bytes: bytes) -> np.ndarray | None:
    arr = np.frombuffer(file_bytes, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def multiotsu_3class_numpy(gray_u8: np.ndarray) -> tuple[int, int]:
    """
    Implementasi exact 3-class Multi-Otsu (Liao et al., 2001) murni dengan NumPy.
    Menghasilkan batas (t1, t2) identik dengan skimage.filters.threshold_multiotsu(classes=3)
    dalam < 1 ms tanpa memerlukan dependensi scikit-image (~80 MB).
    """
    hist = np.bincount(gray_u8.ravel(), minlength=256).astype(np.float64)
    total = hist.sum()
    if total <= 0:
        return (85, 170)

    p = hist / total
    levels = np.arange(256, dtype=np.float64)
    P = np.cumsum(p)
    S = np.cumsum(p * levels)
    S_total = S[-1]

    # Matriks 2D (t1, t2) untuk 0 <= t1 < t2 <= 254 (di-broadcast penuh ke 255x255)
    t1 = np.arange(255)[:, None]
    t2 = np.arange(255)[None, :]
    valid = t2 > t1

    w0 = np.broadcast_to(P[t1], (255, 255))
    s0 = np.broadcast_to(S[t1], (255, 255))

    w1 = P[t2] - w0
    s1 = S[t2] - s0

    w2 = np.broadcast_to(1.0 - P[t2], (255, 255))
    s2 = np.broadcast_to(S_total - S[t2], (255, 255))

    valid = valid & (w0 > 1e-12) & (w1 > 1e-12) & (w2 > 1e-12)
    if not np.any(valid):
        t_val, _ = cv2.threshold(gray_u8, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        return (int(t_val // 2), int(t_val))

    score = np.full((255, 255), -1.0, dtype=np.float64)
    score[valid] = (
        (s0[valid] ** 2) / w0[valid]
        + (s1[valid] ** 2) / w1[valid]
        + (s2[valid] ** 2) / w2[valid]
    )
    best_flat = int(np.argmax(score))
    best_t1, best_t2 = divmod(best_flat, 255)
    return (int(best_t1), int(best_t2))


def binom_sf(k_minus_1: int, n: int, alpha: float) -> float:
    """Survival function P(Z >= k) untuk Z ~ Bin(n, alpha) menggunakan math.comb eksak."""
    k = k_minus_1 + 1
    if k <= 0:
        return 1.0
    if k > n:
        return 0.0
    total = 0.0
    one_minus = 1.0 - alpha
    for i in range(k, n + 1):
        total += math.comb(n, i) * (alpha ** i) * (one_minus ** (n - i))
    return min(1.0, max(0.0, total))


def _apply_colormap_bgr(arr: np.ndarray, vmax: float, colormap: int) -> np.ndarray:
    norm = np.clip((arr / max(vmax, 1e-6)) * 255.0, 0, 255).astype(np.uint8)
    return cv2.applyColorMap(norm, colormap)


def _encode_image_data_uri(
    img_bgr_or_gray: np.ndarray,
    max_dim: int = 1000,
    fmt: str = "jpeg",
    quality: int = 84,
) -> str:
    """Mengubah citra OpenCV menjadi data URI base64 terkompresi agar aman di batas payload 4,5 MB Vercel."""
    h, w = img_bgr_or_gray.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w, new_h = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
        interp = cv2.INTER_NEAREST if fmt == "png_pixel" else cv2.INTER_AREA
        resized = cv2.resize(img_bgr_or_gray, (new_w, new_h), interpolation=interp)
    else:
        resized = img_bgr_or_gray

    if fmt in ("png", "png_pixel"):
        ok, buf = cv2.imencode(".png", resized)
        mime = "image/png"
    else:
        ok, buf = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        mime = "image/jpeg"

    if not ok:
        return ""
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def analyze_receipt(
    img_bgr: np.ndarray,
    cfg: dict[str, Any] | None = None,
    min_area: int = 20,
    max_area: int = 8000,
    pad: int = 3,
    include_stages: bool = True,
) -> dict[str, Any]:
    """
    Menjalankan seluruh 8 tahap pipeline OpenCV klasik pada 1 citra struk BGR
    dan mengembalikan JSON-serializable payload untuk frontend Next.js.
    """
    t0 = time.perf_counter()
    active_cfg = DEFAULT_CONFIG.copy()
    if cfg:
        active_cfg.update(cfg)

    H, W = img_bgr.shape[:2]
    input_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Tahap 2: Pra-pemrosesan (Grayscale + CLAHE)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_clahe = clahe.apply(gray)

    # Tahap 3: Ruang Warna (Sisa Warna / Chromatic Artifact)
    rgb_f = input_rgb.astype(np.float32)
    chroma_mag = np.linalg.norm(rgb_f - rgb_f.mean(axis=2, keepdims=True), axis=2)
    is_color = float(chroma_mag.max()) > 1e-3

    # Tahap 4: Filtering (Residu Noise = Gray - MedianFilter 3x3)
    gray_f = gray.astype(np.float32)
    median_img = cv2.medianBlur(gray, 3)
    noise_res = gray_f - median_img.astype(np.float32)

    # Tahap 5: Segmentasi (Exact 3-class Multi-Otsu th[1] + Adaptive Gaussian)
    t1, t2 = multiotsu_3class_numpy(gray_clahe)
    multiotsu_th = [t1, t2]
    otsu_mask = (gray_clahe < t2).astype(np.uint8) * 255
    adapt_mask = cv2.adaptiveThreshold(
        gray_clahe, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 10
    )
    ink_mask = cv2.bitwise_and(otsu_mask, adapt_mask)

    # Tahap 6A: Morfologi Opening + Masker Tepi 1-px (ClearType)
    k_open = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    clean_mask = cv2.morphologyEx(ink_mask, cv2.MORPH_OPEN, k_open)
    ink_dil1 = cv2.dilate(clean_mask, np.ones((3, 3), np.uint8), iterations=1)
    fringe_ring = cv2.subtract(ink_dil1, clean_mask) > 0

    # Connected Components #1 (per karakter)
    num_labels, labels, stats_cc, _ = cv2.connectedComponentsWithStats(
        clean_mask, connectivity=8
    )
    chars: list[dict[str, Any]] = []
    for cid in range(1, num_labels):
        x, y, w, h, area = stats_cc[cid]
        if area < min_area or area > max_area:
            continue
        if h < 7 or w < 3 or (w / max(h, 1)) > 4.5 or (h / max(w, 1)) > 8.0:
            continue

        c_mask = labels[y : y + h, x : x + w] == cid
        n_core = noise_res[y : y + h, x : x + w][c_mask]
        ch_core = chroma_mag[y : y + h, x : x + w][c_mask]

        px1, py1 = max(0, x - pad), max(0, y - pad)
        px2, py2 = min(W, x + w + pad), min(H, y + h + pad)
        g_pad = gray_f[py1:py2, px1:px2]
        n_pad = noise_res[py1:py2, px1:px2]
        bg_pad = ink_dil1[py1:py2, px1:px2] == 0
        fr_mask = fringe_ring[py1:py2, px1:px2]

        core_chroma_mean = float(ch_core.mean()) if is_color else 0.0
        fringe_chroma_mean = (
            float(chroma_mag[py1:py2, px1:px2][fr_mask].mean())
            if (is_color and fr_mask.any())
            else 0.0
        )

        chars.append(
            {
                "bbox": [int(x), int(y), int(w), int(h)],
                "area": int(area),
                "noise_std": float(n_core.std()),
                "chroma_std": float(ch_core.std()) if is_color else 0.0,
                "core_chroma": core_chroma_mean,
                "cleartype_diff": max(0.0, fringe_chroma_mean - core_chroma_mean),
                "g_pad": g_pad,
                "n_pad": n_pad,
                "bg_pad": bg_pad,
                "in_top_header": (y < 0.10 * H),
            }
        )

    # Tahap 6B: Morfologi Dilasi Horizontal + CC #2 (Blok Kata / Nominal)
    med_w = (
        int(np.clip(np.median([c["bbox"][2] for c in chars]) * 0.9, 5, 22))
        if chars
        else 10
    )
    word_mask = cv2.dilate(
        clean_mask, cv2.getStructuringElement(cv2.MORPH_RECT, (med_w, 3)), iterations=1
    )
    w_num, _, w_stats, _ = cv2.connectedComponentsWithStats(word_mask, connectivity=8)
    words: list[dict[str, Any]] = []
    for wid in range(1, w_num):
        wx, wy, ww, wh, warea = w_stats[wid]
        if warea < min_area * 2:
            continue
        m_idx = [
            idx
            for idx, c in enumerate(chars)
            if wx <= (c["bbox"][0] + c["bbox"][2] / 2) <= wx + ww
            and wy <= (c["bbox"][1] + c["bbox"][3] / 2) <= wy + wh
        ]
        if m_idx:
            words.append({"bbox": [int(wx), int(wy), int(ww), int(wh)], "char_indices": m_idx})

    # Tahap 7A: Cabang CPI (Size-Bucketed Exact/Near-Exact MAD + NCC)
    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)
    for idx, c in enumerate(chars):
        x, y, w, h = c["bbox"]
        if w < 6 or h < 10 or c["area"] < 30 or c["g_pad"].std() < 15.0:
            continue
        buckets[(w, h)].append(idx)

    cpi_candidates: list[dict[str, Any]] = []
    visited_pairs: set[tuple[int, int]] = set()
    for (bw, bh), idxs in buckets.items():
        cand_j = [
            k
            for dw in (-1, 0, 1)
            for dh in (-1, 0, 1)
            for k in buckets.get((bw + dw, bh + dh), [])
        ]
        for i in idxs:
            ci = chars[i]
            x1, y1, w1, h1 = ci["bbox"]
            g1, n1, bg1 = ci["g_pad"], ci["n_pad"], ci["bg_pad"]
            h1p, w1p = g1.shape
            for j in cand_j:
                if j <= i or (i, j) in visited_pairs:
                    continue
                visited_pairs.add((i, j))
                cj = chars[j]
                x2, y2, w2, h2 = cj["bbox"]
                dist = float(np.hypot(x1 - x2, y1 - y2))
                if dist < 20.0:
                    continue

                g2, n2, bg2 = cj["g_pad"], cj["n_pad"], cj["bg_pad"]
                ch_min, cw_min = min(h1p, g2.shape[0]), min(w1p, g2.shape[1])
                if ch_min < 12 or cw_min < 8:
                    continue

                o1y, o1x = (h1p - ch_min) // 2, (w1p - cw_min) // 2
                o2y, o2x = (g2.shape[0] - ch_min) // 2, (g2.shape[1] - cw_min) // 2
                p1 = g1[o1y : o1y + ch_min, o1x : o1x + cw_min]
                p2 = g2[o2y : o2y + ch_min, o2x : o2x + cw_min]

                nw_mask = (p1 < 248.0) | (p2 < 248.0)
                n_nw = int(nw_mask.sum())
                if n_nw < 25:
                    continue
                abs_diff = np.abs(p1[nw_mask] - p2[nw_mask])
                mad_nw = float(abs_diff.mean())
                if mad_nw > 18.0:
                    continue
                exact_nw = float((abs_diff <= 2.0).mean())

                p1z, p2z = p1 - p1.mean(), p2 - p2.mean()
                den_raw = float(np.linalg.norm(p1z) * np.linalg.norm(p2z))
                ncc_raw = float(np.sum(p1z * p2z) / den_raw) if den_raw > 1e-4 else 0.0
                if ncc_raw < 0.85:
                    continue

                r1 = n1[o1y : o1y + ch_min, o1x : o1x + cw_min]
                r2 = n2[o2y : o2y + ch_min, o2x : o2x + cw_min]
                cbg = (
                    bg1[o1y : o1y + ch_min, o1x : o1x + cw_min]
                    & bg2[o2y : o2y + ch_min, o2x : o2x + cw_min]
                )
                if int(cbg.sum()) >= 15:
                    v1, v2 = r1[cbg] - r1[cbg].mean(), r2[cbg] - r2[cbg].mean()
                    den_h = float(np.linalg.norm(v1) * np.linalg.norm(v2))
                    ncc_halo = float(np.dot(v1, v2) / den_h) if den_h > 1e-4 else 0.0
                else:
                    ncc_halo = 0.0

                cpi_candidates.append(
                    {
                        "bbox1": ci["bbox"],
                        "bbox2": cj["bbox"],
                        "mad_nw": round(mad_nw, 3),
                        "exact_nw": round(exact_nw, 4),
                        "ncc_raw": round(ncc_raw, 4),
                        "ncc_halo": round(ncc_halo, 4),
                        "dist": round(dist, 1),
                        "n_nw": n_nw,
                        "both_header": bool(ci["in_top_header"] and cj["in_top_header"]),
                        "same_line_close": bool(abs(y1 - y2) <= 4 and dist < 50.0),
                        "_p1": p1,
                        "_p2": p2,
                    }
                )

    cpi_candidates.sort(key=lambda d: (d["mad_nw"], -d["exact_nw"]))
    cpi_candidates = cpi_candidates[:40]

    # Tahap 7B: Cabang IMI (ClearType Fringe Anomaly + Gardella NFA)
    imi_cleartype: list[dict[str, Any]] = []
    imi_nfa: list[dict[str, Any]] = []

    if len(chars) >= 15:
        if is_color:
            ct_vals = np.array([c["cleartype_diff"] for c in chars], dtype=np.float64)
            med_ct = float(np.median(ct_vals))
            mad_ct = float(np.median(np.abs(ct_vals - med_ct))) + 0.25
            if med_ct < 2.5:
                for c, v in zip(chars, ct_vals):
                    if c["in_top_header"]:
                        continue
                    if c["core_chroma"] < 12.0 and v >= 6.0:
                        rz = (v - med_ct) / (1.4826 * mad_ct)
                        if rz >= 6.0:
                            imi_cleartype.append(
                                {
                                    "bbox": c["bbox"],
                                    "ct_diff": round(float(v), 2),
                                    "core_chroma": round(c["core_chroma"], 2),
                                    "robust_z": round(float(rz), 2),
                                }
                            )
                imi_cleartype.sort(key=lambda d: d["robust_z"], reverse=True)
                imi_cleartype = imi_cleartype[:20]

        alpha = 0.10
        key = (
            "chroma_std"
            if (is_color and np.median([c["chroma_std"] for c in chars]) > 1.5)
            else "noise_std"
        )
        vals = np.array([c[key] for c in chars], dtype=np.float64)
        mu, sigma = vals.mean(), vals.std(ddof=1) + 1e-8
        is_out = vals < (mu - Z_ALPHA_010 * sigma)
        n_tests = max(len(words), 1)
        for w in words:
            idxs = w["char_indices"]
            if len(idxs) < 3 or w["bbox"][1] < 0.10 * H:
                continue
            k = int(is_out[idxs].sum())
            if k >= 2:
                nfa = n_tests * binom_sf(k - 1, len(idxs), alpha)
                if nfa < 0.05:
                    imi_nfa.append(
                        {
                            "bbox": w["bbox"],
                            "n_chars": len(idxs),
                            "k": k,
                            "nfa": float(nfa),
                            "feat": key,
                        }
                    )
        imi_nfa.sort(key=lambda d: d["nfa"])
        imi_nfa = imi_nfa[:10]

    # Tahap 8: Keputusan & Penandaan Area Curiga
    detected_cpi_pairs: list[dict[str, Any]] = []
    detected_boxes: list[dict[str, Any]] = []
    top_cpi_crops: list[dict[str, Any]] = []

    for c in cpi_candidates:
        if active_cfg.get("ignore_top_header", True) and c["both_header"]:
            continue
        if active_cfg.get("ignore_same_line_close", True) and c["same_line_close"]:
            continue
        if (
            c["mad_nw"] <= active_cfg["mad_max"]
            and c["exact_nw"] >= active_cfg["exact_min"]
            and c["ncc_raw"] >= active_cfg["ncc_raw_min"]
            and c["n_nw"] >= active_cfg["min_nw_pixels"]
        ):
            clean_pair = {k: v for k, v in c.items() if not k.startswith("_")}
            detected_cpi_pairs.append(clean_pair)
            detected_boxes.append(
                {
                    "bbox": c["bbox1"],
                    "type": "CPI",
                    "reason": f"CPI (MAD={c['mad_nw']}, Identik={c['exact_nw']*100:.0f}%)",
                    "score": c["exact_nw"],
                }
            )
            detected_boxes.append(
                {
                    "bbox": c["bbox2"],
                    "type": "CPI",
                    "reason": f"CPI (MAD={c['mad_nw']}, Identik={c['exact_nw']*100:.0f}%)",
                    "score": c["exact_nw"],
                }
            )
            if len(top_cpi_crops) < 4:
                p1_u8 = np.clip(c["_p1"], 0, 255).astype(np.uint8)
                p2_u8 = np.clip(c["_p2"], 0, 255).astype(np.uint8)
                diff_bgr = _apply_colormap_bgr(np.abs(c["_p1"] - c["_p2"]), 60.0, cv2.COLORMAP_HOT)
                scale = 6
                top_cpi_crops.append(
                    {
                        **clean_pair,
                        "patch1_uri": _encode_image_data_uri(
                            cv2.resize(p1_u8, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST),
                            max_dim=320,
                            fmt="png_pixel",
                        ),
                        "patch2_uri": _encode_image_data_uri(
                            cv2.resize(p2_u8, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST),
                            max_dim=320,
                            fmt="png_pixel",
                        ),
                        "diff_uri": _encode_image_data_uri(
                            cv2.resize(diff_bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST),
                            max_dim=320,
                            fmt="png_pixel",
                        ),
                    }
                )

    detected_imi: list[dict[str, Any]] = []
    ct_hits = [
        h
        for h in imi_cleartype
        if h["robust_z"] >= active_cfg["ct_z_min"]
        and h["ct_diff"] >= active_cfg["ct_diff_min"]
    ]
    if len(ct_hits) >= active_cfg["ct_min_chars"]:
        for h in ct_hits:
            detected_imi.append({**h, "method": "ClearType Fringe"})
            detected_boxes.append(
                {
                    "bbox": h["bbox"],
                    "type": "IMI",
                    "reason": f"IMI ClearType (z={h['robust_z']})",
                    "score": h["robust_z"],
                }
            )

    if active_cfg.get("use_nfa", False):
        for h in imi_nfa:
            if h["nfa"] < active_cfg["nfa_max"]:
                detected_imi.append({**h, "method": "Gardella NFA"})
                detected_boxes.append(
                    {
                        "bbox": h["bbox"],
                        "type": "IMI",
                        "reason": f"IMI NFA ({h['nfa']:.1e})",
                        "score": -math.log10(h["nfa"] + 1e-12),
                    }
                )

    pred = 1 if len(detected_boxes) > 0 else 0
    verdict = (
        "TERINDIKASI DIMANIPULASI"
        if pred == 1
        else "ASLI (TIDAK TERINDIKASI MANIPULASI)"
    )

    stages_uri: dict[str, str] = {}
    if include_stages:
        result_bgr = img_bgr.copy()
        thick = max(2, int(round(min(H, W) / 350)))
        for cp in detected_cpi_pairs[:12]:
            x1, y1, w1, h1 = cp["bbox1"]
            x2, y2, w2, h2 = cp["bbox2"]
            pt1 = (int(x1 + w1 / 2), int(y1 + h1 / 2))
            pt2 = (int(x2 + w2 / 2), int(y2 + h2 / 2))
            # Oranye BGR = (11, 158, 245)
            cv2.line(result_bgr, pt1, pt2, (11, 158, 245), max(1, thick - 1), cv2.LINE_AA)
        for bx in detected_boxes[:30]:
            x, y, w, h = bx["bbox"]
            # Merah BGR = (38, 38, 220), Ungu BGR = (234, 51, 147)
            color = (38, 38, 220) if bx["type"] == "CPI" else (234, 51, 147)
            cv2.rectangle(result_bgr, (x - 2, y - 2), (x + w + 2, y + h + 2), color, thick)

        rng = np.random.default_rng(42)
        palette_cc = rng.integers(50, 255, size=(num_labels, 3), dtype=np.uint8)
        palette_cc[0] = [0, 0, 0]
        cc_vis_bgr = palette_cc[labels]

        word_overlay_bgr = img_bgr.copy()
        for w_item in words:
            wx, wy, ww, wh = w_item["bbox"]
            cv2.rectangle(word_overlay_bgr, (wx, wy), (wx + ww, wy + wh), (74, 163, 22), max(1, thick - 1))

        stages_uri = {
            "input": _encode_image_data_uri(img_bgr, max_dim=1100, fmt="jpeg", quality=86),
            "result": _encode_image_data_uri(result_bgr, max_dim=1100, fmt="jpeg", quality=88),
            "clahe": _encode_image_data_uri(gray_clahe, max_dim=900, fmt="jpeg", quality=80),
            "chroma": _encode_image_data_uri(
                _apply_colormap_bgr(chroma_mag, 40.0, cv2.COLORMAP_INFERNO),
                max_dim=900,
                fmt="jpeg",
                quality=80,
            ),
            "noise": _encode_image_data_uri(
                _apply_colormap_bgr(np.abs(noise_res), 25.0, cv2.COLORMAP_MAGMA),
                max_dim=900,
                fmt="jpeg",
                quality=80,
            ),
            "mask": _encode_image_data_uri(clean_mask, max_dim=900, fmt="png"),
            "cc": _encode_image_data_uri(cc_vis_bgr, max_dim=900, fmt="jpeg", quality=82),
            "words": _encode_image_data_uri(word_overlay_bgr, max_dim=900, fmt="jpeg", quality=82),
        }

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)

    return {
        "pred": pred,
        "verdict": verdict,
        "summary": {
            "width": W,
            "height": H,
            "is_color": is_color,
            "color_label": "True Color (RGB)" if is_color else "Grayscale",
            "n_chars": len(chars),
            "n_words": len(words),
            "n_cpi_pairs": len(detected_cpi_pairs),
            "n_imi_hits": len(detected_imi),
            "multiotsu_thresholds": multiotsu_th,
            "elapsed_ms": elapsed_ms,
        },
        "cpi_pairs": detected_cpi_pairs,
        "imi_hits": detected_imi,
        "boxes": detected_boxes,
        "top_cpi_crops": top_cpi_crops,
        "stages": stages_uri,
        "config_used": active_cfg,
    }
