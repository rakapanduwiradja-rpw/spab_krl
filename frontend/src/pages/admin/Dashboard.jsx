import { useEffect, useState } from "react";
import api from "../../lib/api";
import { formatRupiah, formatDateTime, formatPeriode, waLink } from "../../lib/format";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
    Users,
    ClipboardList,
    Receipt,
    AlertCircle,
    TrendingUp,
    ArrowUpRight,
    Droplets,
    CheckCircle2,
    Clock,
    MessageCircle,
    CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";

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

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [tagihan, setTagihan] = useState([]);
    const [loadingTagihan, setLoadingTagihan] = useState(false);
    const periodeOptions = getPeriodeOptions();
    // Pencatatan periode filter (default: bulan sebelumnya)
    const [pencatatanPeriode, setPencatatanPeriode] = useState(() => {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prev.getFullYear();
        const m = String(prev.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}-01T00:00:00+00:00`;
    });
    // Default ke bulan sebelumnya (tagihan Mei muncul di awal Juni)
    const [selectedPeriode, setSelectedPeriode] = useState(() => {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prev.getFullYear();
        const m = String(prev.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}-01T00:00:00+00:00`;
    });

    useEffect(() => {
        api.get("/dashboard_stats", { params: { pencatatan_periode: pencatatanPeriode } }).then((r) => setData(r.data.data));
    }, [pencatatanPeriode]);

    useEffect(() => {
        setLoadingTagihan(true);
        const params = { status: "BELUM" };
        if (selectedPeriode !== "all") params.periode = selectedPeriode;
        api.get("/tagihan_list", { params })
            .then((r) => setTagihan(r.data.data.slice(0, 20)))
            .finally(() => setLoadingTagihan(false));
    }, [selectedPeriode]);

    if (!data)
        return (
            <div className="text-slate-500" data-testid="dashboard-loading">
                Memuat dashboard...
            </div>
        );

    const kpis = [
        {
            label: "Pelanggan Aktif",
            value: data.total_pelanggan,
            icon: Users,
            color: "bg-blue-500/10 text-blue-600",
        },
        {
            label: "Pencatatan Bulan Ini",
            value: data.total_pencatatan_bulan,
            icon: ClipboardList,
            color: "bg-emerald-500/10 text-emerald-600",
        },
        {
            label: "Tagihan Bulan Ini",
            value: formatRupiah(data.total_tagihan_bulan),
            icon: Receipt,
            color: "bg-violet-500/10 text-violet-600",
        },
        {
            label: "Tunggakan",
            value: formatRupiah(data.total_tunggakan),
            sub: `${data.jumlah_belum_bayar} tagihan`,
            icon: AlertCircle,
            color: "bg-amber-500/10 text-amber-600",
        },
    ];

    return (
        <div className="space-y-7" data-testid="admin-dashboard">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
                        Selamat datang kembali
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Ringkasan operasional SPAB KRL Ragam Berseri periode
                        ini.
                    </p>
                </div>
                <Link to="/admin/pelanggan/tambah">
                    <Button
                        className="bg-[hsl(var(--primary))]"
                        data-testid="btn-tambah-pelanggan-dash"
                    >
                        + Tambah Pelanggan
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => (
                    <Card
                        key={k.label}
                        className="p-5 spab-shadow border-slate-200"
                        data-testid={`kpi-${k.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}
                        >
                            <k.icon className="w-5 h-5" />
                        </div>
                        <div className="text-slate-500 text-xs uppercase tracking-wide mt-4">
                            {k.label}
                        </div>
                        <div className="text-2xl font-semibold mt-1">
                            {k.value}
                        </div>
                        {k.sub && (
                            <div className="text-xs text-slate-400 mt-0.5">
                                {k.sub}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 lg:col-span-2 border-slate-200">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div>
                            <h2 className="font-semibold">Progres Pencatatan per RT</h2>
                            {data.pencatatan_periode && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Periode: {new Date(data.pencatatan_periode).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                                </p>
                            )}
                        </div>
                        <Select value={pencatatanPeriode} onValueChange={setPencatatanPeriode}>
                            <SelectTrigger className="h-8 text-xs w-40 border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {periodeOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {data.progres_rt?.length > 0 ? (
                        <div className="space-y-4">
                            {data.progres_rt.map((rt) => {
                                const pct = rt.total > 0 ? Math.round((rt.dicatat / rt.total) * 100) : 0;
                                return (
                                    <div key={rt.rt}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium">{rt.rt}</span>
                                            <span className="text-slate-500">
                                                {rt.dicatat}/{rt.total} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[hsl(var(--primary))] rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        {rt.belum > 0 && rt.belum_list?.length > 0 && (
                                            <div className="mt-2 pl-1">
                                                <p className="text-[11px] text-slate-400 mb-1">Belum dicatat ({rt.belum}):</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {rt.belum_list.map((p) => (
                                                        <span key={p.id} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                                                            {p.nama}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400 py-4 text-center">
                            Belum ada data progres.
                        </div>
                    )}
                </Card>

                <Card className="p-5 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Aktivitas Terbaru</h2>
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                    </div>
                    <ul className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                        {data.aktivitas.length === 0 && (
                            <li className="text-sm text-slate-400">
                                Belum ada aktivitas.
                            </li>
                        )}
                        {data.aktivitas.map((a, i) => {
                            const Icon =
                                a.tipe === "BAYAR"
                                    ? CheckCircle2
                                    : a.tipe === "ANOMALI"
                                      ? AlertCircle
                                      : Droplets;
                            const color =
                                a.tipe === "BAYAR"
                                    ? "text-emerald-600 bg-emerald-50"
                                    : a.tipe === "ANOMALI"
                                      ? "text-amber-600 bg-amber-50"
                                      : "text-blue-600 bg-blue-50";
                            return (
                                <li key={i} className="flex gap-3 text-sm">
                                    <div
                                        className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${color}`}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-slate-700 leading-snug">
                                            {a.deskripsi}
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDateTime(a.waktu)}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            </div>

            <Card className="p-5 border-slate-200">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="font-semibold">Tagihan Belum Dibayar</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Filter Periode */}
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
                                <SelectTrigger className="h-8 text-xs w-40 border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Periode</SelectItem>
                                    {periodeOptions.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Link
                            to="/admin/tagihan"
                            className="text-xs text-[hsl(var(--primary))] flex items-center gap-1"
                        >
                            Semua tagihan <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                {loadingTagihan ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                        <Clock className="w-4 h-4 animate-spin" />
                        Memuat...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-slate-200">
                                    <th className="py-2.5 pr-4 font-medium">
                                        Pelanggan
                                    </th>
                                    <th className="py-2.5 pr-4 font-medium">RT</th>
                                    <th className="py-2.5 pr-4 font-medium hidden sm:table-cell">
                                        Periode
                                    </th>
                                    <th className="py-2.5 pr-4 font-medium hidden md:table-cell">
                                        No. Tagihan
                                    </th>
                                    <th className="py-2.5 pr-4 font-medium">
                                        Total
                                    </th>
                                    <th className="py-2.5 pr-4 font-medium">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tagihan.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-6 text-center text-slate-400"
                                        >
                                            {selectedPeriode === "all"
                                                ? "Tidak ada tunggakan 🎉"
                                                : `Tidak ada tunggakan untuk periode ${periodeOptions.find(o => o.value === selectedPeriode)?.label || ""}`}
                                        </td>
                                    </tr>
                                )}
                                {tagihan.map((t) => (
                                    <tr
                                        key={t.id}
                                        className="border-b border-slate-100 last:border-0"
                                        data-testid={`dashboard-tagihan-row-${t.id}`}
                                    >
                                        <td className="py-3 pr-4 font-medium">
                                            {t.nama_pelanggan}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Badge variant="outline">{t.rt}</Badge>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-500 text-xs hidden sm:table-cell">
                                            {formatPeriode(t.periode_bulan || t.periode)}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-500 font-mono text-xs hidden md:table-cell">
                                            {t.nomor_tagihan}
                                        </td>
                                        <td className="py-3 pr-4 font-semibold">
                                            {formatRupiah(t.total_tagihan)}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <KirimWA tagihan={t} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

function KirimWA({ tagihan }) {
    const [pel, setPel] = useState(null);
    useEffect(() => {
        api.get("/pelanggan_detail", { params: { id: tagihan.id_pelanggan } }).then((r) =>
            setPel(r.data.data.pelanggan),
        );
    }, [tagihan.id_pelanggan]);
    const msg = `Halo ${tagihan.nama_pelanggan}, tagihan air SPAB KRL Ragam Berseri periode ini sebesar *${formatRupiah(tagihan.total_tagihan)}* (No: ${tagihan.nomor_tagihan}). Mohon segera dilunasi. Terima kasih 🙏`;
    return (
        <a
            href={pel ? waLink(pel.no_telepon, msg) : "#"}
            target="_blank"
            rel="noreferrer"
            data-testid={`wa-btn-${tagihan.id}`}
        >
            <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs"
                disabled={!pel}
            >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp
            </Button>
        </a>
    );
}
