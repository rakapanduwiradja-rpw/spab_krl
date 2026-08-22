import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem("spab_user");
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("spab_token");
        if (!token) {
            setLoading(false);
            return;
        }
        api.get("/auth_me")
            .then((r) => {
                setUser(r.data.data);
                localStorage.setItem("spab_user", JSON.stringify(r.data.data));
            })
            .catch(() => {
                localStorage.removeItem("spab_token");
                localStorage.removeItem("spab_user");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        const r = await api.post("/auth_login", { username, password });
        const { token, user: u } = r.data.data;
        localStorage.setItem("spab_token", token);
        localStorage.setItem("spab_user", JSON.stringify(u));
        setUser(u);
        return u;
    };

    const logout = () => {
        localStorage.removeItem("spab_token");
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
