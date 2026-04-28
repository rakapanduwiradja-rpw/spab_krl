import { useEffect, useState } from "react";
import api from "../../lib/api";
import { formatRupiah, formatDateTime, waLink } from "../../lib/format";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
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
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [tagihan, setTagihan] = useState([]);

    useEffect(() => {
        api.get("/dashboard/stats").then((r) => setData(r.data.data));
        api.get("/tagihan?status=BELUM").then((r) =>
            setTagihan(r.data.data.slice(0, 5)),
        );
    }, []);

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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">
                            Progres Pencatatan per RT
                        </h2>
                        <Link
                            to="/admin/pencatatan"
                            className="text-xs text-[hsl(var(--primary))] flex items-center gap-1"
                        >
                            Detail <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {data.rt_stats.map((rt) => {
                            const pct = rt.total
                                ? (rt.sudah / rt.total) * 100
                                : 0;
                            return (
                                <div
                                    key={rt.rt}
                                    className="p-4 rounded-xl border border-slate-200 bg-slate-50"
                                    data-testid={`rt-stat-${rt.rt}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-sm">
                                            {rt.rt}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px]"
                                        >
                                            {rt.total} KK
                                        </Badge>
                                    </div>
                                    <div className="text-2xl font-semibold mt-2">
                                        {rt.sudah}
                                        <span className="text-sm text-slate-400 font-normal">
                                            /{rt.total}
                                        </span>
                                    </div>
                                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[hsl(var(--primary))]"
                                            style={{ width: `${pct}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                                        <span>
                                            {Math.round(pct)}% tercatat
                                        </span>
                                        {rt.anomali > 0 && (
                                            <span className="text-amber-600 font-medium">
                                                ⚠ {rt.anomali} anomali
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6">
                        <div className="text-xs text-slate-500 mb-3 uppercase tracking-wide">
                            Peta titik meteran
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {data.rt_stats.map((rt) => {
                                const dots = [];
                                for (let i = 0; i < rt.total; i++) {
                                    const cls =
                                        i < rt.anomali
                                            ? "bg-amber-500"
                                            : i < rt.sudah
                                              ? "bg-emerald-500"
                                              : "bg-slate-300";
                                    dots.push(
                                        <span
                                            key={`${rt.rt}-${i}`}
                                            className={`w-2.5 h-2.5 rounded-full ${cls}`}
                                            title={`${rt.rt}`}
                                        ></span>,
                                    );
                                }
                                return (
                                    <div
                                        key={rt.rt}
                                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200"
                                    >
                                        <span className="text-[11px] font-semibold mr-1">
                                            {rt.rt}
                                        </span>
                                        {dots}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-4 mt-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
                                Tercatat
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>{" "}
                                Anomali
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>{" "}
                                Belum
                            </span>
                        </div>
                    </div>
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">Tagihan Belum Dibayar</h2>
                    <Link
                        to="/admin/tagihan"
                        className="text-xs text-[hsl(var(--primary))] flex items-center gap-1"
                    >
                        Semua tagihan <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-200">
                                <th className="py-2.5 pr-4 font-medium">
                                    Pelanggan
                                </th>
                                <th className="py-2.5 pr-4 font-medium">RT</th>
                                <th className="py-2.5 pr-4 font-medium">
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
                                        colSpan={5}
                                        className="py-6 text-center text-slate-400"
                                    >
                                        Tidak ada tunggakan 🎉
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
                                    <td className="py-3 pr-4 text-slate-500 font-mono text-xs">
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
            </Card>
        </div>
    );
}

function KirimWA({ tagihan }) {
    const [pel, setPel] = useState(null);
    useEffect(() => {
        api.get(`/pelanggan/${tagihan.id_pelanggan}`).then((r) =>
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
