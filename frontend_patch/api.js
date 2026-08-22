import axios from "axios";

// URL Cloud Functions region asia-southeast1
// Ganti YOUR_PROJECT_ID dengan project ID Firebase Anda
const FUNCTIONS_BASE = process.env.REACT_APP_FUNCTIONS_BASE_URL ||
    "https://asia-southeast2-spab-krl-ragamberseri.cloudfunctions.net";

const api = axios.create({ baseURL: FUNCTIONS_BASE });

// Map endpoint lama -> nama function baru
// Format: GET /pelanggan -> /pelanggan_list
//         POST /pelanggan -> /pelanggan_create
//         GET /pelanggan/:id -> /pelanggan_detail?id=xxx
export const ENDPOINTS = {
    // Auth
    AUTH_LOGIN:         "/auth_login",
    AUTH_ME:            "/auth_me",

    // Pelanggan
    PELANGGAN_LIST:     "/pelanggan_list",
    PELANGGAN_CREATE:   "/pelanggan_create",
    PELANGGAN_DETAIL:   "/pelanggan_detail",   // + ?id=xxx
    PELANGGAN_UPDATE:   "/pelanggan_update",   // + ?id=xxx

    // Meteran
    METERAN_SCAN:       "/meteran_scan",       // + ?qr=xxx

    // Pencatatan
    PENCATATAN_LIST:    "/pencatatan_list",
    PENCATATAN_CREATE:  "/pencatatan_create",

    // Tagihan
    TAGIHAN_LIST:       "/tagihan_list",
    TAGIHAN_DETAIL:     "/tagihan_detail",     // + ?id=xxx
    TAGIHAN_BAYAR:      "/tagihan_bayar",      // + ?id=xxx

    // Dashboard & Tren
    DASHBOARD_STATS:    "/dashboard_stats",
    TREN_PEMAKAIAN:     "/tren_pemakaian",
    TREN_ANOMALI:       "/tren_anomali",

    // Tarif
    TARIF_LIST:         "/tarif_list",
    TARIF_CREATE:       "/tarif_create",

    // Petugas
    PETUGAS_LIST:       "/petugas_list",
    PETUGAS_CREATE:     "/petugas_create",

    // Pengaturan
    PENGATURAN_GET:     "/pengaturan_get",
    PENGATURAN_UPDATE:  "/pengaturan_update",
};

// Attach Firebase ID Token ke setiap request
api.interceptors.request.use(async (cfg) => {
    const token = localStorage.getItem("spab_id_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem("spab_id_token");
            localStorage.removeItem("spab_user");
            if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    },
);

export function formatApiError(err) {
    const d = err?.response?.data?.message ?? err?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
    return err?.message || "Terjadi kesalahan";
}

export default api;
