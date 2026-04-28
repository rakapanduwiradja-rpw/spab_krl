import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children, role }) {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading)
        return (
            <div
                className="flex items-center justify-center min-h-screen text-slate-500"
                data-testid="auth-loading"
            >
                Memuat...
            </div>
        );
    if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
    if (role && user.role !== role) {
        const dest = user.role === "ADMIN" ? "/admin" : "/petugas";
        return <Navigate to={dest} replace />;
    }
    return children;
}
