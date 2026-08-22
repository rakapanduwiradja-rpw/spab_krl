import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
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
    Label,
} from "../../components/ui/label";
import {
    formatRupiah,
    formatPeriode,
    formatDate,
    waLink,
} from "../../lib/format";
import {
    MessageCircle,
    Check,
    Search,
    FileText,
} from "lucide-react";
import { StatusBadge } from "./PelangganDetail";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Tagihan() {
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState("ALL");
    const [rt, setRt] = useState("ALL");
    const [q, setQ] = useState("");
    const [bayar, setBayar] = useState(null); // tagihan obj
    const [metode, setMetode] = useState("TUNAI");
    const [nominal, setNominal] = useState(0);

    const load = async () => {
        const params = {};
        if (status !== "ALL") params.status = status;
        if (rt !== "ALL") params.rt = rt;
        if (q) params.q = q;
        const r = await api.get("/tagihan_list", { params });
        setItems(r.data.data);
    };

    useEffect(() => {
        load(); // eslint-disable-next-line
    }, [status, rt]);

    const kirimWABatch = async () => {
        const belum = items.filter((t) => t.status_bayar !== "LUNAS");
        if (belum.length === 0) {
            toast.info("Tidak ada tagihan belum bayar");
            return;
        }
        // Open first then leave it to user
        for (const t of belum.slice(0, 3)) {
            const pelRes = await api.get("/pelanggan_detail", { params: { id: t.id_pelanggan } });
            const p = pelRes.data.data.pelanggan;
            const msg = `Halo ${t.nama_pelanggan}, tagihan air SPAB KRL Ragam Berseri ${formatPeriode(t.periode_bulan)} sebesar *${formatRupiah(t.total_tagihan)}* (No: ${t.nomor_tagihan}). Mohon segera dilunasi. Terima kasih 🙏`;
            window.open(waLink(p.no_telepon, msg), "_blank");
        }
        toast.success(`Membuka chat WA untuk ${Math.min(belum.length, 3)} tagihan`);
    };

    const openBayar = (t) => {
        setBayar(t);
        setMetode("TUNAI");
        setNominal(Number(t.sisa_tagihan ?? t.total_tagihan));
    };

    const doBayar = async () => {
        if (!bayar) return;
        try {
            await api.post("/tagihan_bayar", {
                id: bayar.id,
                metode_bayar: metode,
                nominal_bayar: Number(nominal),
            });
            toast.success("Pembayaran berhasil dicatat");
            setBayar(null);
            load();
        } catch (ex) {
            toast.error(formatApiError(ex));
        }
    };

    return (
        <div className="space-y-6" data-testid="tagihan-page">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Tagihan & Pembayaran
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Kelola semua tagihan bulanan dan pembayaran.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={kirimWABatch}
                        data-testid="btn-wa-batch"
                    >
                        <MessageCircle className="w-4 h-4 mr-1.5 text-emerald-600" />{" "}
                        Kirim WA Batch
                    </Button>
                </div>
            </div>

            <Card className="p-4 flex flex-wrap gap-3 items-center border-slate-200">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Cari nama / no. tagihan..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && load()}
                        className="pl-9"
                        data-testid="input-search-tagihan"
                    />
                </div>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger
                        className="w-[160px]"
                        data-testid="select-status-tagihan"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua status</SelectItem>
                        <SelectItem value="BELUM">Belum Bayar</SelectItem>
                        <SelectItem value="SEBAGIAN">Sebagian</SelectItem>
                        <SelectItem value="LUNAS">Lunas</SelectItem>
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
                <Button variant="outline" onClick={load}>
                    Cari
                </Button>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-3 px-4 text-left font-medium">
                                    No. Tagihan
                                </th>
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
                                    Total
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Status
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Bayar
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="py-10 text-center text-slate-400"
                                    >
                                        Tidak ada tagihan.
                                    </td>
                                </tr>
                            )}
                            {items.map((t) => (
                                <tr
                                    key={t.id}
                                    className="border-t border-slate-100"
                                    data-testid={`tag-row-${t.id}`}
                                >
                                    <td className="py-3 px-4 font-mono text-xs text-[hsl(var(--primary))]">
                                        {t.nomor_tagihan}
                                    </td>
                                    <td className="py-3 px-4 font-medium">
                                        {t.nama_pelanggan}
                                    </td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline">{t.rt}</Badge>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500">
                                        {formatPeriode(t.periode_bulan)}
                                    </td>
                                    <td className="py-3 px-4 font-semibold">
                                        {formatRupiah(t.total_tagihan)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <StatusBadge s={t.status_bayar} />
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 text-xs">
                                        {t.tanggal_bayar ? (
                                            <>
                                                {formatDate(t.tanggal_bayar)}
                                                <div className="font-mono">
                                                    {t.metode_bayar}
                                                </div>
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex gap-1.5">
                                            {t.status_bayar !== "LUNAS" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs"
                                                    onClick={() => openBayar(t)}
                                                    data-testid={`btn-bayar-${t.id}`}
                                                >
                                                    <Check className="w-3.5 h-3.5 mr-1" />{" "}
                                                    Bayar
                                                </Button>
                                            )}
                                            <Link
                                                to={`/admin/nota?id=${t.id}`}
                                                data-testid={`btn-nota-${t.id}`}
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs"
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1" />{" "}
                                                    Nota
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Dialog open={!!bayar} onOpenChange={(o) => !o && setBayar(null)}>
                <DialogContent data-testid="dialog-bayar">
                    <DialogHeader>
                        <DialogTitle>Tandai Lunas / Bayar Sebagian</DialogTitle>
                    </DialogHeader>
                    {bayar && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                <div className="font-semibold">
                                    {bayar.nama_pelanggan} · {bayar.rt}
                                </div>
                                <div className="text-slate-500 text-xs font-mono">
                                    {bayar.nomor_tagihan}
                                </div>
                                <div className="mt-2 text-lg font-semibold text-[hsl(var(--primary))]">
                                    {formatRupiah(bayar.sisa_tagihan ?? bayar.total_tagihan)}
                                </div>
                            </div>
                            <div>
                                <Label>Metode pembayaran</Label>
                                <Select value={metode} onValueChange={setMetode}>
                                    <SelectTrigger className="mt-1.5" data-testid="select-metode-bayar">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TUNAI">Tunai</SelectItem>
                                        <SelectItem value="QRIS">QRIS</SelectItem>
                                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Nominal dibayar</Label>
                                <Input
                                    type="number"
                                    value={nominal}
                                    onChange={(e) => setNominal(e.target.value)}
                                    className="mt-1.5"
                                    data-testid="input-nominal-bayar"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBayar(null)}>
                            Batal
                        </Button>
                        <Button onClick={doBayar} data-testid="btn-konfirmasi-bayar">
                            Konfirmasi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}