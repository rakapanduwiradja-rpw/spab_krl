import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useEffect, useState } from "react";
import api from "../lib/api";
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    Receipt,
    TrendingUp,
    Printer,
    Coins,
    Settings,
    UserCog,
    QrCode,
    LogOut,
    Droplets,
    Menu,
    X,
} from "lucide-react";

const ITEMS = [
    { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/pelanggan", icon: Users, label: "Pelanggan" },
    { to: "/admin/pencatatan", icon: ClipboardList, label: "Pencatatan" },
    { to: "/admin/tagihan", icon: Receipt, label: "Tagihan", badge: true },
    { to: "/admin/tren", icon: TrendingUp, label: "Tren Pemakaian" },
    { to: "/admin/nota", icon: Printer, label: "Cetak Nota" },
    { to: "/admin/tarif", icon: Coins, label: "Tarif" },
    { to: "/admin/petugas", icon: UserCog, label: "Petugas" },
    { to: "/admin/print-qr", icon: QrCode, label: "Print QR Massal" },
    { to: "/admin/pengaturan", icon: Settings, label: "Pengaturan" },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const [badge, setBadge] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        api.get("/dashboard_stats")
            .then((r) => setBadge(r.data.data.jumlah_belum_bayar))
            .catch(() => {});
    }, []);

    const Side = (
        <aside className="w-64 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] flex flex-col h-screen sticky top-0">
            <div className="px-6 py-6 flex items-center gap-3 border-b border-[hsl(var(--sidebar-border))]">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                    <div className="font-semibold leading-tight text-[15px]">
                        SPAB KRL
                    </div>
                    <div className="text-xs text-slate-400">Ragam Berseri</div>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {ITEMS.map((it) => (
                    <NavLink
                        key={it.to}
                        to={it.to}
                        end={it.end}
                        onClick={() => setOpen(false)}
                        data-testid={`nav-${it.label.toLowerCase().replace(/\s/g, "-")}`}
                        className={({ isActive }) =>
                            `group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? "bg-[hsl(var(--primary))] text-white" : "text-slate-300 hover:bg-[hsl(var(--sidebar-muted))] hover:text-white"}`
                        }
                    >
                        <span className="flex items-center gap-3">
                            <it.icon className="w-4 h-4" />
                            {it.label}
                        </span>
                        {it.badge && badge > 0 && (
                            <span className="text-[11px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
                                {badge}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>
            <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
                <div className="flex items-center justify-between px-2 py-2">
                    <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                            {user?.nama}
                        </div>
                        <div className="text-xs text-slate-400">
                            {user?.role}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            logout();
                            nav("/login");
                        }}
                        data-testid="logout-btn"
                        className="p-2 rounded-lg hover:bg-[hsl(var(--sidebar-muted))] text-slate-300"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );

    return (
        <div className="flex min-h-screen">
            <div className="hidden lg:block">{Side}</div>
            {open && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setOpen(false)}
                    ></div>
                    <div className="relative z-10">{Side}</div>
                </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
                    <button
                        onClick={() => setOpen(true)}
                        data-testid="open-sidebar-btn"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="font-semibold text-sm">SPAB KRL</div>
                    <button
                        onClick={() => {
                            logout();
                            nav("/login");
                        }}
                        data-testid="mobile-logout-btn"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </header>
                <main className="flex-1 p-5 lg:p-8 max-w-[1400px] w-full mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
