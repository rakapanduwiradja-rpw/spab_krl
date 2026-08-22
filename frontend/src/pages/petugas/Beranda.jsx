import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatRupiah, formatDate } from "../../lib/format";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    QrCode,
    Receipt,
    UserPlus,
    AlertCircle,
    Droplets,
    Printer,
    CreditCard,
    ChevronDown,
} from "lucide-react";

function getPeriodeOptions() {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const iso = `${y}-${m}-01T00:00:00+00:00`;
        const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        opts.push({ value: iso, label });
    }
    return opts;
}

export default function Beranda() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [belum, setBelum] = useState([]);
    const [showBelumList, setShowBelumList] = useState(false);
    const periodeOptions = getPeriodeOptions();
    const [pencatatanPeriode, setPencatatanPeriode] = useState(() => {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prev.getFullYear();
        const m = String(prev.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}-01T00:00:00+00:00`;
    });

    useEffect(() => {
        api.get("/dashboard_stats", { params: { pencatatan_periode: pencatatanPeriode } }).then((r) => setStats(r.data.data));
    }, [pencatatanPeriode]);

    useEffect(() => {
        api.get("/tagihan_list", { params: { status: "BELUM" } }).then((r) =>
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
                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] text-slate-300 uppercase tracking-wide">
                                    Pencatatan {new Date(pencatatanPeriode).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                                </span>
                                <select
                                    className="text-[11px] bg-white/10 text-white border border-white/20 rounded-md px-2 py-0.5 outline-none cursor-pointer"
                                    value={pencatatanPeriode}
                                    onChange={(e) => setPencatatanPeriode(e.target.value)}
                                >
                                    {periodeOptions.map((o) => (
                                        <option key={o.value} value={o.value} className="text-slate-800">
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
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
                            {/* Detail belum dicatat */}
                            {stats.progres_rt && stats.progres_rt.some(r => r.belum > 0) && (
                                <button
                                    className="mt-2 w-full text-[11px] text-slate-300 bg-white/10 rounded-lg py-1.5 px-2 text-left flex items-center justify-between"
                                    onClick={() => setShowBelumList(v => !v)}
                                >
                                    <span>Lihat yang belum dicatat</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBelumList ? "rotate-180" : ""}`} />
                                </button>
                            )}
                            {showBelumList && stats.progres_rt && (
                                <div className="mt-2 space-y-2">
                                    {stats.progres_rt.filter(r => r.belum > 0).map((rt) => (
                                        <div key={rt.rt} className="bg-white/10 rounded-lg p-2.5">
                                            <div className="text-[11px] font-semibold text-white mb-1">
                                                {rt.rt} — {rt.belum} belum dicatat
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {rt.belum_list?.map((p) => (
                                                    <span key={p.id} className="text-[10px] bg-amber-400/20 text-amber-200 rounded px-1.5 py-0.5">
                                                        {p.nama}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <div className="px-5 -mt-3">
                <Card className="p-4 spab-shadow border-slate-200 grid grid-cols-4 gap-2">
                    <QuickAction
                        to="/petugas/scan"
                        icon={QrCode}
                        label="Scan Meter"
                        color="bg-[hsl(var(--primary))]"
                    />
                    <QuickAction
                        to="/petugas/bayar-cari"
                        icon={CreditCard}
                        label="Bayar"
                        color="bg-[hsl(var(--accent))]"
                    />
                    <QuickAction
                        to="/petugas/nota"
                        icon={Printer}
                        label="Cetak Nota"
                        color="bg-emerald-600"
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
