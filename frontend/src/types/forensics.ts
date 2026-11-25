export interface ForensicSummary {
  width: number;
  height: number;
  is_color: boolean;
  color_label: string;
  n_chars: number;
  n_words: number;
  n_cpi_pairs: number;
  n_imi_hits: number;
  multiotsu_thresholds: number[];
  elapsed_ms: number;
}

export interface CpiPair {
  bbox1: [number, number, number, number];
  bbox2: [number, number, number, number];
  mad_nw: number;
  exact_nw: number;
  ncc_raw: number;
  ncc_halo: number;
  dist: number;
  n_nw: number;
  both_header: boolean;
  same_line_close: boolean;
}

export interface CpiCrop extends CpiPair {
  patch1_uri: string;
  patch2_uri: string;
  diff_uri: string;
}

export interface ImiHit {
  bbox: [number, number, number, number];
  method: string;
  ct_diff?: number;
  core_chroma?: number;
  robust_z?: number;
  n_chars?: number;
  k?: number;
  nfa?: number;
}

export interface DetectedBox {
  bbox: [number, number, number, number];
  type: "CPI" | "IMI";
  reason: string;
  score: number;
}

export interface ForensicStages {
  input: string;
  result: string;
  clahe: string;
  chroma: string;
  noise: string;
  mask: string;
  cc: string;
  words: string;
}

export interface ForensicConfig {
  mad_max: number;
  exact_min: number;
  ncc_raw_min: number;
  min_nw_pixels: number;
  ignore_top_header: boolean;
  ignore_same_line_close: boolean;
  ct_z_min: number;
  ct_diff_min: number;
  ct_min_chars: number;
  use_nfa: boolean;
  nfa_max: number;
}

export interface AnalysisResponse {
  filename: string;
  pred: 0 | 1;
  verdict: string;
  summary: ForensicSummary;
  cpi_pairs: CpiPair[];
  imi_hits: ImiHit[];
  boxes: DetectedBox[];
  top_cpi_crops: CpiCrop[];
  stages: ForensicStages;
  config_used: ForensicConfig;
}

