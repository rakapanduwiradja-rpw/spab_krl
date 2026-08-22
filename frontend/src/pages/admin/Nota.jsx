import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
    ArrowLeft, Printer, CheckCircle, Bluetooth, BluetoothConnected,
    Loader2, AlertCircle, FileText, Search, Filter
} from "lucide-react";
import { formatRupiah, formatPeriode } from "../../lib/format";
import { useBluetoothPrinter } from "../../lib/BluetoothPrinterContext";
import BluetoothPrinterPanel from "../../components/BluetoothPrinterPanel";
import NotaTagihan, { NotaStyles } from "../../components/NotaTagihan";

// ─── Halaman Detail Nota (Admin) ──────────────────────────────────────────────
export function AdminNotaDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [showBtPanel, setShowBtPanel] = useState(false);
    const [printingBt, setPrintingBt] = useState(false);
    const [btMsg, setBtMsg] = useState("");

    const { printerInfo, printNota, supported: btSupported, isPairing } = useBluetoothPrinter();

    useEffect(() => {
        if (!id) {
            setErr("ID tagihan diperlukan");
            return;
        }
        api.get("/tagihan_detail", { params: { id } })
            .then(r => setData(r.data.data))
            .catch(ex => setErr(formatApiError(ex)));
    }, [id]);

    const handlePrintWindow = () => window.print();

    const handlePrintBluetooth = async () => {
        if (!data) return;
        setBtMsg("");
        setPrintingBt(true);
        try {
            await printNota(data.tagihan, data.pelanggan, data.pengaturan);
            setBtMsg("Nota berhasil dicetak!");
        } catch (e) {
            setBtMsg("Gagal cetak: " + (e?.message || "Error tidak diketahui"));
        } finally {
            setPrintingBt(false);
        }
    };

    if (err) return (
        <div className="p-6">
            <div className="text-red-600 mb-3">{err}</div>
            <Button onClick={() => nav("/admin/nota")}>Kembali</Button>
        </div>
    );
    if (!data) return <div className="p-6 text-slate-500">Memuat nota...</div>;

    const { tagihan: t, pelanggan: p, pengaturan: s } = data;

    return (
        <div className="min-h-screen bg-slate-50 pb-6">
            {/* Toolbar */}
            <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                    <button onClick={() => nav("/admin/nota")} className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setShowBtPanel(v => !v); setBtMsg(""); }}
                            className={printerInfo ? "border-blue-300 text-blue-700 bg-blue-50" : ""}
                        >
                            {printerInfo
                                ? <><BluetoothConnected className="w-3.5 h-3.5 mr-1" />BT</>
                                : <><Bluetooth className="w-3.5 h-3.5 mr-1" />BT</>
                            }
                        </Button>
                        <Button size="sm" variant="outline" onClick={handlePrintWindow}>
                            <Printer className="w-3.5 h-3.5 mr-1" /> Print
                        </Button>
                    </div>
                </div>

                {showBtPanel && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                            <Bluetooth className="w-3.5 h-3.5" /> Printer Bluetooth
                        </div>
                        <BluetoothPrinterPanel compact />
                    </div>
                )}

                {btSupported && (
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handlePrintBluetooth}
                        disabled={printingBt || isPairing}
                    >
                        {printingBt || isPairing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isPairing ? "Mencari printer..." : "Mencetak..."}</>
                        ) : printerInfo ? (
                            <><BluetoothConnected className="w-4 h-4 mr-2" />Cetak via {printerInfo.name}</>
                        ) : (
                            <><Bluetooth className="w-4 h-4 mr-2" />Cetak via Bluetooth</>
                        )}
                    </Button>
                )}

                {btMsg && (
                    <div className={`text-xs px-3 py-2 rounded-lg flex items-start gap-2 ${btMsg.startsWith("Gagal") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {btMsg.startsWith("Gagal")
                            ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            : <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        }
                        {btMsg}
                    </div>
                )}
            </div>

            {/* NOTA */}
            <div className="p-4 flex justify-center">
                <NotaTagihan tagihan={t} pelanggan={p} pengaturan={s} />
            </div>

            <NotaStyles />
        </div>
    );
}

// ─── Halaman List Nota (Admin) ─────────────────────────────────────────────────
export default function AdminNotaList() {
    const nav = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("SEMUA");
    const [q, setQ] = useState("");

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (filter !== "SEMUA") params.status = filter;
        if (q.trim()) params.q = q.trim();
        api.get("/tagihan_list", { params })
            .then(r => setItems(r.data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [filter, q]);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Cetak Nota</h1>
                <p className="text-sm text-slate-500">Pilih tagihan untuk melihat dan mencetak nota</p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama, nomor tagihan, ID meteran..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {["SEMUA", "BELUM", "LUNAS"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                filter === f
                                    ? "bg-blue-600 text-white border-transparent"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {f === "SEMUA" ? "Semua" : f === "BELUM" ? "Belum Bayar" : "Lunas"}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="text-slate-400 text-sm text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat tagihan...
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="text-slate-400 text-sm text-center py-12">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada tagihan ditemukan
                </div>
            )}

            <div className="space-y-2">
                {items.map(t => (
                    <Card
                        key={t.id}
                        className="p-4 border-slate-200 flex items-center gap-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        onClick={() => nav(`/admin/nota/${t.id}`)}
                    >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-slate-800">{t.nama_pelanggan}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {t.rt} · {formatPeriode(t.periode_bulan)}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{t.nomor_tagihan}</div>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-1">
                            <Badge className={
                                t.status_bayar === "LUNAS"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
                            }>
                                {t.status_bayar === "LUNAS" ? "Lunas" : "Belum Bayar"}
                            </Badge>
                            <div className="text-sm font-bold text-slate-700">
                                {formatRupiah(t.total_tagihan)}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
