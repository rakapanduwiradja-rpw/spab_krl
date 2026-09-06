import axios from "axios";

// Sebelumnya: baseURL "/api" + Firebase Hosting rewrites -> Cloud Functions.
// Sekarang: langsung ke backend Flask di Render (Cloud Functions tidak dipakai lagi).
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || "https://spab-krl.vercel.app/",
});

api.interceptors.request.use((cfg) => {
    const token =
        localStorage.getItem("spab_id_token") ||
        localStorage.getItem("spab_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem("spab_id_token");
            localStorage.removeItem("spab_token");
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
    if (Array.isArray(d))
        return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
    return err?.message || "Terjadi kesalahan";
}

export default api;