import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
    formatRupiah,
    formatPeriode,
    formatDate,
    formatNumber,
    waLink,
} from "../../lib/format";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, MessageCircle, Printer } from "lucide-react";
import { printStiker } from "../../components/StikerQR";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function PelangganDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/pelanggan/${id}`).then((r) => setData(r.data.data));
    }, [id]);

    if (!data) return <div className="text-slate-500">Memuat...</div>;
    const { pelanggan: p, pencatatan, tagihan } = data;

    const chart = [...pencatatan]
        .reverse()
        .map((c) => ({
            label: formatPeriode(c.periode_bulan),
            pemakaian: Number(c.pemakaian_m3),
        }));

    return (
        <div className="space-y-6" data-testid="pelanggan-detail-page">
            <Link
                to="/admin/pelanggan"
                className="text-sm text-slate-500 inline-flex items-center gap-1"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </Link>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-5 border-slate-200 lg:col-span-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">{p.nama}</h1>
                            <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                                <Badge variant="outline">{p.rt}</Badge>
                                <span>{p.qr_code}</span>
                                <span>·</span>
                                <span>
                                    {(p.golongan || "").replace("_", " ")}
                                </span>
                            </div>
                        </div>
                        <a
                            href={waLink(
                                p.no_telepon,
                                `Halo ${p.nama}, dari SPAB KRL Ragam Berseri.`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`wa-pelanggan-${p.id}`}
                        >
                            <Button variant="outline" size="sm" className="h-8">
                                <MessageCircle className="w-4 h-4 mr-1.5 text-emerald-600" />{" "}
                                WA
                            </Button>
                        </a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-sm">
                        <Info label="No. KTP" value={p.nomor_ktp} mono />
                        <Info label="No. HP" value={p.no_telepon} mono />
                        <Info label="Alamat" value={p.alamat || "-"} />
                        <Info
                            label="No. Seri Meter"
                            value={p.no_seri_meter}
                            mono
                        />
                        <Info
                            label="Angka Awal"
                            value={`${formatNumber(p.angka_awal, 1)} m³`}
                        />
                        <Info
                            label="Meter Terakhir"
                            value={`${formatNumber(p.angka_meter_terakhir, 1)} m³`}
                        />
                        <Info
                            label="Terdaftar"
                            value={formatDate(p.tanggal_daftar)}
                        />
                        <Info
                            label="Status"
                            value={p.status_aktif ? "Aktif" : "Non-aktif"}
                        />
                    </div>

                    {chart.length > 0 && (
                        <div className="mt-6">
                            <div className="text-xs uppercase text-slate-500 tracking-wide mb-2">
                                Tren Pemakaian (m³)
                            </div>
                            <div className="h-[220px]">
                                <ResponsiveContainer>
                                    <LineChart data={chart}>
                                        <XAxis
                                            dataKey="label"
                                            fontSize={11}
                                            stroke="#94a3b8"
                                        />
                                        <YAxis fontSize={11} stroke="#94a3b8" />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="pemakaian"
                                            stroke="#1A6BFF"
                                            strokeWidth={2.5}
                                            dot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-5 border-slate-200 text-center">
                    <div className="text-xs uppercase text-slate-500 tracking-wide mb-3">
                        QR Stiker Meteran
                    </div>
                    <div className="inline-block p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl">
                        <QRCodeSVG value={p.qr_code} size={160} />
                    </div>
                    <div className="text-sm font-semibold mt-3">{p.nama}</div>
                    <div className="text-xs text-slate-500">
                        {p.qr_code} · {p.rt}
                    </div>
                    <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => printStiker([p])}
                        data-testid="btn-cetak-stiker-detail"
                    >
                        <Printer className="w-4 h-4 mr-1.5" /> Cetak Stiker
                    </Button>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 font-semibold">
                        Riwayat Pencatatan
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Periode
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Meter
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Pemakaian
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {pencatatan.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-6 text-center text-slate-400"
                                    >
                                        Belum ada pencatatan
                                    </td>
                                </tr>
                            )}
                            {pencatatan.map((c) => (
                                <tr
                                    key={c.id}
                                    className="border-t border-slate-100"
                                >
                                    <td className="py-2.5 px-4">
                                        {formatPeriode(c.periode_bulan)}
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-xs">
                                        {formatNumber(c.angka_meter_lalu, 1)} →{" "}
                                        {formatNumber(c.angka_meter_kini, 1)}
                                    </td>
                                    <td className="py-2.5 px-4">
                                        {c.is_anomali && (
                                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 mr-2">
                                                Anomali
                                            </Badge>
                                        )}
                                        <span className="font-semibold">
                                            {formatNumber(c.pemakaian_m3, 1)} m³
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card className="border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 font-semibold">
                        Riwayat Tagihan
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Periode
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Total
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tagihan.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-6 text-center text-slate-400"
                                    >
                                        Belum ada tagihan
                                    </td>
                                </tr>
                            )}
                            {tagihan.map((t) => (
                                <tr
                                    key={t.id}
                                    className="border-t border-slate-100"
                                >
                                    <td className="py-2.5 px-4">
                                        {formatPeriode(t.periode_bulan)}
                                    </td>
                                    <td className="py-2.5 px-4 font-semibold">
                                        {formatRupiah(t.total_tagihan)}
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <StatusBadge s={t.status_bayar} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    );
}

function Info({ label, value, mono }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
                {label}
            </div>
            <div
                className={`font-medium mt-0.5 ${mono ? "font-mono text-[13px]" : ""}`}
            >
                {value}
            </div>
        </div>
    );
}

export function StatusBadge({ s }) {
    if (s === "LUNAS")
        return (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                Lunas
            </Badge>
        );
    if (s === "SEBAGIAN")
        return (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                Sebagian
            </Badge>
        );
    return (
        <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
            Belum Bayar
        </Badge>
    );
}
