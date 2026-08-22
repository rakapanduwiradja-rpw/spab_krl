import { useEffect, useState } from "react";
import api from "../../lib/api";
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
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { formatRupiah, formatNumber } from "../../lib/format";

const COLORS = ["#1A6BFF", "#00C2A8", "#F59E0B", "#8B5CF6", "#EC4899"];

function getPeriodeOptions() {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const iso = `${y}-${m}-01T00:00:00+00:00`;
        const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        opts.push({ value: iso, label });
    }
    return opts;
}

export default function Tren() {
    const [rt, setRt] = useState("ALL");
    // mode: "3" | "6" | "12" | "semua" | "bulan-spesifik"
    const [mode, setMode] = useState("12");
    const [periodeSpesifik, setPeriodeSpesifik] = useState("");
    const [data, setData] = useState(null);
    const [anomali, setAnomali] = useState([]);
    const periodeOptions = getPeriodeOptions();

    useEffect(() => {
        const params = {};
        if (rt !== "ALL") params.rt = rt;
        if (mode === "semua") {
            params.semua = true;
        } else if (mode === "bulan-spesifik") {
            if (!periodeSpesifik) return;
            params.periode_spesifik = periodeSpesifik;
        } else {
            params.bulan = Number(mode);
        }
        api.get("/tren_pemakaian", { params }).then((r) =>
            setData(r.data.data),
        );
    }, [rt, mode, periodeSpesifik]);

    useEffect(() => {
        api.get("/tren_anomali").then((r) => setAnomali(r.data.data));
    }, []);

    if (!data) return <div className="text-slate-500">Memuat tren...</div>;

    const totalM3 = data.data.reduce((s, d) => s + d.pemakaian_m3, 0);
    const totalTerkumpul = data.data.reduce(
        (s, d) => s + d.pendapatan_terkumpul,
        0,
    );
    const totalTerbit = data.data.reduce((s, d) => s + d.pendapatan_terbit, 0);

    return (
        <div className="space-y-6" data-testid="tren-page">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold">Tren Pemakaian</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Analisis tren pemakaian air dan pendapatan.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Select value={rt} onValueChange={setRt}>
                        <SelectTrigger
                            className="w-[140px]"
                            data-testid="select-rt-tren"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua RT</SelectItem>
                            <SelectItem value="RT01">RT 01</SelectItem>
                            <SelectItem value="RT02">RT 02</SelectItem>
                            <SelectItem value="RT03">RT 03</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={mode}
                        onValueChange={(v) => {
                            setMode(v);
                            if (v !== "bulan-spesifik") setPeriodeSpesifik("");
                        }}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 bulan</SelectItem>
                            <SelectItem value="3">3 bulan</SelectItem>
                            <SelectItem value="6">6 bulan</SelectItem>
                            <SelectItem value="12">12 bulan</SelectItem>
                            <SelectItem value="semua">Semua</SelectItem>
                            <SelectItem value="bulan-spesifik">Pilih bulan...</SelectItem>
                        </SelectContent>
                    </Select>
                    {mode === "bulan-spesifik" && (
                        <Select value={periodeSpesifik} onValueChange={setPeriodeSpesifik}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Pilih bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {periodeOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Kpi label="Total Pemakaian" value={`${formatNumber(totalM3, 1)} m³`} />
                <Kpi label="Tagihan Terbit" value={formatRupiah(totalTerbit)} />
                <Kpi
                    label="Pendapatan Terkumpul"
                    value={formatRupiah(totalTerkumpul)}
                    sub={`${totalTerbit ? Math.round((totalTerkumpul / totalTerbit) * 100) : 0}% dari terbit`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="p-5 border-slate-200">
                    <h2 className="font-semibold mb-4">Tren Pemakaian (m³)</h2>
                    <div className="h-[260px]">
                        <ResponsiveContainer>
                            <LineChart data={data.data}>
                                <XAxis
                                    dataKey="label"
                                    fontSize={11}
                                    stroke="#94a3b8"
                                />
                                <YAxis fontSize={11} stroke="#94a3b8" />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="pemakaian_m3"
                                    stroke="#1A6BFF"
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-5 border-slate-200">
                    <h2 className="font-semibold mb-4">
                        Tagihan Terbit vs Terkumpul
                    </h2>
                    <div className="h-[260px]">
                        <ResponsiveContainer>
                            <BarChart data={data.data}>
                                <XAxis
                                    dataKey="label"
                                    fontSize={11}
                                    stroke="#94a3b8"
                                />
                                <YAxis fontSize={11} stroke="#94a3b8" />
                                <Tooltip formatter={(v) => formatRupiah(v)} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar
                                    dataKey="pendapatan_terbit"
                                    fill="#93C5FD"
                                    name="Terbit"
                                />
                                <Bar
                                    dataKey="pendapatan_terkumpul"
                                    fill="#1A6BFF"
                                    name="Terkumpul"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-5 border-slate-200">
                    <h2 className="font-semibold mb-4">Distribusi Golongan</h2>
                    <div className="h-[260px]">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.distribusi_golongan}
                                    dataKey="total_m3"
                                    nameKey="golongan"
                                    innerRadius={55}
                                    outerRadius={90}
                                    label={(e) =>
                                        `${e.golongan.replace("_", " ")}: ${formatNumber(e.total_m3, 0)}m³`
                                    }
                                >
                                    {data.distribusi_golongan.map((_, i) => (
                                        <Cell
                                            key={i}
                                            fill={COLORS[i % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-5 border-slate-200">
                    <h2 className="font-semibold mb-4">Anomali per Bulan</h2>
                    <div className="h-[260px]">
                        <ResponsiveContainer>
                            <BarChart data={data.data}>
                                <XAxis
                                    dataKey="label"
                                    fontSize={11}
                                    stroke="#94a3b8"
                                />
                                <YAxis fontSize={11} stroke="#94a3b8" />
                                <Tooltip />
                                <Bar
                                    dataKey="jumlah_anomali"
                                    fill="#F59E0B"
                                    name="Jumlah anomali"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 font-semibold flex items-center justify-between">
                    <span>Daftar Anomali Terdeteksi</span>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                        {anomali.length} kasus
                    </Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Nama
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    RT
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Pemakaian
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Rata-rata
                                </th>
                                <th className="py-2.5 px-4 text-left font-medium">
                                    Selisih
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {anomali.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 text-center text-slate-400"
                                    >
                                        Belum ada anomali terdeteksi.
                                    </td>
                                </tr>
                            )}
                            {anomali.map((a) => (
                                <tr
                                    key={a.id}
                                    className="border-t border-slate-100"
                                >
                                    <td className="py-2.5 px-4 font-medium">
                                        {a.nama}
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <Badge variant="outline">{a.rt}</Badge>
                                    </td>
                                    <td className="py-2.5 px-4 font-semibold">
                                        {formatNumber(a.pemakaian_m3, 2)} m³
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-500">
                                        {formatNumber(a.rata_rata, 2)} m³
                                    </td>
                                    <td className="py-2.5 px-4">
                                        <span className="text-amber-600 font-semibold">
                                            +{formatNumber(a.persen_selisih, 1)}%
                                        </span>
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

function Kpi({ label, value, sub }) {
    return (
        <Card className="p-5 border-slate-200">
            <div className="text-xs uppercase text-slate-500 tracking-wide">
                {label}
            </div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </Card>
    );
}
