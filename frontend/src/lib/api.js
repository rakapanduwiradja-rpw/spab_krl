import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem("spab_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
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
    const d = err?.response?.data?.detail ?? err?.response?.data?.message;
    if (typeof d === "string") return d;
    if (Array.isArray(d))
        return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
    if (d?.msg) return d.msg;
    return err?.message || "Terjadi kesalahan";
}

export default api;
