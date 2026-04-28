import { NavLink, Outlet } from "react-router-dom";
import { Home, QrCode, History, User } from "lucide-react";

const TABS = [
    { to: "/petugas", end: true, icon: Home, label: "Beranda" },
    { to: "/petugas/scan", icon: QrCode, label: "Scan" },
    { to: "/petugas/riwayat", icon: History, label: "Riwayat" },
    { to: "/petugas/profil", icon: User, label: "Profil" },
];

export default function PetugasLayout() {
    return (
        <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-20 relative">
            <Outlet />
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex justify-around py-2 z-40 spab-shadow">
                {TABS.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        end={t.end}
                        data-testid={`tab-${t.label.toLowerCase()}`}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center gap-1 py-1 text-[11px] ${isActive ? "text-[hsl(var(--primary))] font-semibold" : "text-slate-500"}`
                        }
                    >
                        <t.icon className="w-5 h-5" />
                        {t.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
