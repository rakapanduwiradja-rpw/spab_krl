import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    formatPeriode,
    formatDateTime,
    formatNumber,
} from "../../lib/format";
import { Download } from "lucide-react";

function currentPeriodeISO() {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString();
}

export default function Pencatatan() {
    const [periode, setPeriode] = useState(currentPeriodeISO());
    const [rt, setRt] = useState("ALL");
    const [items, setItems] = useState([]);

    useEffect(() => {
        const params = { periode };
        if (rt !== "ALL") params.rt = rt;
        api.get("/pencatatan", { params }).then((r) => setItems(r.data.data));
    }, [periode, rt]);

    const exportCSV = () => {
        const rows = [
            [
                "Nama",
                "RT",
                "Periode",
                "Meter Lalu",
                "Meter Kini",
                "Pemakaian",
                "Anomali",
                "Waktu",
            ],
        ];
        items.forEach((c) =>
            rows.push([
                c.nama_pelanggan,
                c.rt,
                formatPeriode(c.periode_bulan),
                c.angka_meter_lalu,
                c.angka_meter_kini,
                c.pemakaian_m3,
                c.is_anomali ? "YA" : "",
                c.waktu_catat,
            ]),
        );
        const csv = rows.map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pencatatan-${periode.slice(0, 7)}.csv`;
        a.click();
    };

    const periodeOptions = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const iso = new Date(
            Date.UTC(d.getFullYear(), d.getMonth(), 1),
        ).toISOString();
        periodeOptions.push({ iso, label: formatPeriode(iso) });
    }

    return (
        <div className="space-y-6" data-testid="pencatatan-page">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold">Pencatatan Meter</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Semua pencatatan angka meter per periode.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={exportCSV}
                    data-testid="btn-export-csv"
                >
                    <Download className="w-4 h-4 mr-1.5" /> Export CSV
                </Button>
            </div>

            <Card className="p-4 flex flex-wrap gap-3 border-slate-200">
                <Select value={periode} onValueChange={setPeriode}>
                    <SelectTrigger
                        className="w-[180px]"
                        data-testid="select-periode"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {periodeOptions.map((p) => (
                            <SelectItem key={p.iso} value={p.iso}>
                                {p.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={rt} onValueChange={setRt}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua RT</SelectItem>
                        <SelectItem value="RT01">RT 01</SelectItem>
                        <SelectItem value="RT02">RT 02</SelectItem>
                        <SelectItem value="RT03">RT 03</SelectItem>
                    </SelectContent>
                </Select>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-3 px-4 text-left font-medium">
                                    Pelanggan
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    RT
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Meter Lalu
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Meter Kini
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Pemakaian
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Anomali
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Waktu
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-10 text-center text-slate-400"
                                    >
                                        Belum ada pencatatan untuk periode ini.
                                    </td>
                                </tr>
                            )}
                            {items.map((c) => (
                                <tr
                                    key={c.id}
                                    className="border-t border-slate-100"
                                >
                                    <td className="py-3 px-4 font-medium">
                                        {c.nama_pelanggan}
                                    </td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline">{c.rt}</Badge>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs">
                                        {formatNumber(c.angka_meter_lalu, 1)}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs">
                                        {formatNumber(c.angka_meter_kini, 1)}
                                    </td>
                                    <td className="py-3 px-4 font-semibold">
                                        {formatNumber(c.pemakaian_m3, 2)} m³
                                    </td>
                                    <td className="py-3 px-4">
                                        {c.is_anomali ? (
                                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 spab-pulse">
                                                ⚠ Anomali
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-300">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 text-xs">
                                        {formatDateTime(c.waktu_catat)}
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
