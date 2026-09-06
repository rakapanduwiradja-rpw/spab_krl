import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../components/ui/dialog";
import {
    formatPeriode,
    formatDateTime,
    formatNumber,
} from "../../lib/format";
import { Download, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function currentPeriodeISO() {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString();
}

export default function Pencatatan() {
    const [periode, setPeriode] = useState(currentPeriodeISO());
    const [rt, setRt] = useState("ALL");
    const [items, setItems] = useState([]);
    const [editCatat, setEditCatat] = useState(null);
    const [hapusCatat, setHapusCatat] = useState(null);
    const [loading, setLoading] = useState(false);

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

    const load = () => {
        const params = { periode };
        if (rt !== "ALL") params.rt = rt;
        api.get("/pencatatan_list", { params }).then((r) => setItems(r.data.data));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periode, rt]);

    const exportCSV = () => {
        const rows = [
            [
                "Nama",
                "RT",
                "Periode",
                "Meter Awal",
                "Meter Akhir",
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
                c.angka_meter_awal,
                c.angka_meter_akhir,
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

    const bukaEdit = (c) => {
        setEditCatat({
            id: c.id,
            periode_bulan: c.periode_bulan,
            angka_meter_awal: c.angka_meter_awal,
            angka_meter_akhir: c.angka_meter_akhir,
            catatan: c.catatan || "",
        });
    };

    const simpanEditCatat = async () => {
        if (!editCatat) return;
        const awal = Number(editCatat.angka_meter_awal);
        const akhir = Number(editCatat.angka_meter_akhir);
        if (Number.isNaN(awal) || Number.isNaN(akhir)) {
            toast.error("Angka meter tidak valid");
            return;
        }
        if (akhir < awal) {
            toast.error("Meter akhir tidak boleh lebih kecil dari meter awal");
            return;
        }
        setLoading(true);
        try {
            await api.put(
                "/pencatatan_update",
                {
                    periode: editCatat.periode_bulan,
                    angka_meter_awal: awal,
                    angka_meter_akhir: akhir,
                    catatan: editCatat.catatan,
                },
                { params: { id: editCatat.id } },
            );
            toast.success("Pencatatan berhasil dikoreksi");
            setEditCatat(null);
            load();
        } catch (ex) {
            toast.error(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    const konfirmasiHapus = async () => {
        if (!hapusCatat) return;
        setLoading(true);
        try {
            await api.post("/pencatatan_hapus", {}, { params: { id: hapusCatat.id } });
            toast.success("Pencatatan dihapus");
            setHapusCatat(null);
            load();
        } catch (ex) {
            toast.error(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6" data-testid="pencatatan-page">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold">Pencatatan Meter</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Semua pencatatan angka meter per periode. Admin dapat
                        mengoreksi periode atau angka meter jika petugas salah catat.
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
                                    Periode
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Meter Awal
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Meter Akhir
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
                                <th className="py-3 px-4 text-right font-medium">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
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
                                    data-testid={`pencatatan-row-${c.id}`}
                                >
                                    <td className="py-3 px-4 font-medium">
                                        {c.nama_pelanggan}
                                    </td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline">{c.rt}</Badge>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 text-xs">
                                        {formatPeriode(c.periode_bulan)}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs">
                                        {formatNumber(c.angka_meter_awal, 1)}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs">
                                        {formatNumber(c.angka_meter_akhir, 1)}
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
                                        {c.dikoreksi && (
                                            <Badge className="ml-1.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                                                Dikoreksi
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 text-xs">
                                        {formatDateTime(c.waktu_catat)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2.5"
                                                onClick={() => bukaEdit(c)}
                                                data-testid={`btn-edit-${c.id}`}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => setHapusCatat(c)}
                                                data-testid={`btn-hapus-${c.id}`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Dialog Koreksi Pencatatan */}
            <Dialog open={!!editCatat} onOpenChange={(o) => !o && setEditCatat(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Koreksi Pencatatan</DialogTitle>
                    </DialogHeader>
                    {editCatat && (
                        <div className="space-y-3 py-2">
                            <div>
                                <Label>Periode</Label>
                                <Select
                                    value={editCatat.periode_bulan}
                                    onValueChange={(v) =>
                                        setEditCatat((p) => ({ ...p, periode_bulan: v }))
                                    }
                                >
                                    <SelectTrigger className="mt-1.5">
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
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Meter Awal (m³)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="mt-1.5 font-mono"
                                        value={editCatat.angka_meter_awal}
                                        onChange={(e) =>
                                            setEditCatat((p) => ({
                                                ...p,
                                                angka_meter_awal: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Meter Akhir (m³)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="mt-1.5 font-mono"
                                        value={editCatat.angka_meter_akhir}
                                        onChange={(e) =>
                                            setEditCatat((p) => ({
                                                ...p,
                                                angka_meter_akhir: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Catatan</Label>
                                <Input
                                    className="mt-1.5"
                                    value={editCatat.catatan}
                                    onChange={(e) =>
                                        setEditCatat((p) => ({ ...p, catatan: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Mengubah periode atau angka meter akan otomatis
                                memperbarui data di Firebase, termasuk pemakaian
                                dan tagihan terkait pencatatan ini.
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCatat(null)}>
                            Batal
                        </Button>
                        <Button
                            onClick={simpanEditCatat}
                            disabled={loading}
                            className="bg-[hsl(var(--primary))]"
                        >
                            {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Hapus Pencatatan */}
            <Dialog open={!!hapusCatat} onOpenChange={(o) => !o && setHapusCatat(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">
                            Hapus Pencatatan
                        </DialogTitle>
                    </DialogHeader>
                    {hapusCatat && (
                        <p className="text-sm text-slate-600 py-2">
                            Pencatatan <strong>{hapusCatat.nama_pelanggan}</strong>{" "}
                            periode <strong>{formatPeriode(hapusCatat.periode_bulan)}</strong>{" "}
                            akan dihapus beserta tagihan terkait. Tindakan ini tidak
                            dapat dibatalkan.
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHapusCatat(null)}>
                            Batal
                        </Button>
                        <Button
                            onClick={konfirmasiHapus}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {loading ? "Menghapus..." : "Hapus"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}