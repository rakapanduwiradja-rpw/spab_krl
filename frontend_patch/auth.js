import { createContext, useContext, useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged } from "firebase/auth";
import api, { ENDPOINTS } from "./api";

// ---------------------------------------------------------------------------
// Firebase config — isi dari Firebase Console > Project Settings > Your Apps
// ---------------------------------------------------------------------------
const firebaseConfig = {
    apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem("spab_user");
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Pantau perubahan state Firebase Auth
        const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
            if (fbUser) {
                try {
                    // Ambil ID token terbaru
                    const idToken = await fbUser.getIdToken();
                    localStorage.setItem("spab_id_token", idToken);

                    // Ambil data user dari Firestore via Cloud Function
                    const r = await api.get(ENDPOINTS.AUTH_ME);
                    const userData = r.data.data;
                    localStorage.setItem("spab_user", JSON.stringify(userData));
                    setUser(userData);
                } catch {
                    localStorage.removeItem("spab_id_token");
                    localStorage.removeItem("spab_user");
                    setUser(null);
                }
            } else {
                localStorage.removeItem("spab_id_token");
                localStorage.removeItem("spab_user");
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const login = async (username, password) => {
        // 1. Kirim username/password ke backend, dapat custom token
        const r = await api.post(ENDPOINTS.AUTH_LOGIN, { username, password });
        const { custom_token, user: userData } = r.data.data;

        // 2. Sign in ke Firebase dengan custom token
        const credential = await signInWithCustomToken(firebaseAuth, custom_token);

        // 3. Ambil ID token untuk request berikutnya
        const idToken = await credential.user.getIdToken();
        localStorage.setItem("spab_id_token", idToken);
        localStorage.setItem("spab_user", JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = async () => {
        await signOut(firebaseAuth);
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
