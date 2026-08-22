import axios from "axios";

// Pakai /api prefix - routing lewat Firebase Hosting rewrites
// Ini menghilangkan CORS karena request ke domain yang sama
const api = axios.create({ baseURL: "/api" });

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
