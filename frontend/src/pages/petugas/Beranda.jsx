import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatRupiah, formatDate } from "../../lib/format";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
    QrCode,
    Receipt,
    UserPlus,
    AlertCircle,
    Droplets,
} from "lucide-react";

export default function Beranda() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [belum, setBelum] = useState([]);

    useEffect(() => {
        api.get("/dashboard/stats").then((r) => setStats(r.data.data));
        api.get("/tagihan?status=BELUM").then((r) =>
            setBelum(r.data.data.slice(0, 5)),
        );
    }, []);

    return (
        <div className="pb-6" data-testid="petugas-beranda">
            <header className="px-5 pt-8 pb-6 bg-[hsl(var(--sidebar))] text-white rounded-b-3xl relative overflow-hidden">
                <div className="absolute -top-20 -right-10 w-56 h-56 rounded-full bg-[hsl(var(--primary))] opacity-20 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
                            <Droplets className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-300">
                                {formatDate(new Date().toISOString())}
                            </div>
                            <div className="font-semibold">SPAB KRL</div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <div className="text-sm text-slate-300">Selamat datang,</div>
                        <div className="text-xl font-semibold">
                            {user?.nama || "Petugas"}
                        </div>
                    </div>

                    {stats && (
                        <div className="mt-5 grid grid-cols-3 gap-2">
                            <StatMini label="Total" value={stats.total_pelanggan} />
                            <StatMini
                                label="Dicatat"
                                value={stats.total_pencatatan_bulan}
                            />
                            <StatMini
                                label="Belum"
                                value={
                                    stats.total_pelanggan -
                                    stats.total_pencatatan_bulan
                                }
                            />
                        </div>
                    )}
                </div>
            </header>

            <div className="px-5 -mt-3">
                <Card className="p-4 spab-shadow border-slate-200 grid grid-cols-3 gap-2">
                    <QuickAction
                        to="/petugas/scan"
                        icon={QrCode}
                        label="Scan Meter"
                        color="bg-[hsl(var(--primary))]"
                    />
                    <QuickAction
                        to="/petugas/riwayat"
                        icon={Receipt}
                        label="Riwayat"
                        color="bg-[hsl(var(--accent))]"
                    />
                    <QuickAction
                        to="/petugas/tambah-pelanggan"
                        icon={UserPlus}
                        label="Tambah"
                        color="bg-amber-500"
                    />
                </Card>
            </div>

            <div className="px-5 mt-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-sm">
                        Tagihan Belum Dibayar
                    </h2>
                    <Badge
                        variant="outline"
                        className="text-[10px]"
                        data-testid="count-belum-bayar"
                    >
                        {belum.length} pending
                    </Badge>
                </div>
                <div className="space-y-2">
                    {belum.length === 0 && (
                        <Card className="p-4 text-sm text-slate-400 text-center border-slate-200">
                            Semua pelanggan sudah bayar 🎉
                        </Card>
                    )}
                    {belum.map((t) => (
                        <Link to={`/petugas/bayar/${t.id}`} key={t.id}>
                            <Card
                                className="p-4 spab-shadow border-slate-200 flex items-center gap-3"
                                data-testid={`petugas-belum-${t.id}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">
                                        {t.nama_pelanggan}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {t.rt} · {t.nomor_tagihan}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                                    {formatRupiah(t.total_tagihan)}
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatMini({ label, value }) {
    return (
        <div className="bg-white/10 rounded-lg py-2.5 px-3">
            <div className="text-[10px] uppercase text-slate-300">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    );
}

function QuickAction({ to, icon: Icon, label, color }) {
    return (
        <Link
            to={to}
            className="flex flex-col items-center text-center py-2"
            data-testid={`qa-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
            <div
                className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center`}
            >
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-[11px] mt-2 font-medium">{label}</div>
        </Link>
    );
}
