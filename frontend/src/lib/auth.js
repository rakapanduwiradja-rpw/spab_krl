import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Pakai /api prefix - sama domain, tidak ada CORS
const BASE = "/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("spab_user");
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("spab_id_token");
        if (token) {
            axios.get(`${BASE}/auth_me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(r => {
                    const userData = r.data.data;
                    localStorage.setItem("spab_user", JSON.stringify(userData));
                    setUser(userData);
                })
                .catch(() => {
                    localStorage.removeItem("spab_id_token");
                    localStorage.removeItem("spab_user");
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const r = await axios.post(`${BASE}/auth_login`, { username, password });
        const { id_token, user: userData } = r.data.data;
        localStorage.setItem("spab_id_token", id_token);
        localStorage.setItem("spab_user", JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem("spab_id_token");
        localStorage.removeItem("spab_user");
        setUser(null);
    };

    return (
        <AuthCtx.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
