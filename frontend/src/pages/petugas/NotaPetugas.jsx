import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
    ArrowLeft, Printer, CheckCircle, Bluetooth, BluetoothConnected,
    Loader2, AlertCircle, FileText
} from "lucide-react";
import { formatRupiah, formatPeriode } from "../../lib/format";
import { useBluetoothPrinter } from "../../lib/BluetoothPrinterContext";
import BluetoothPrinterPanel from "../../components/BluetoothPrinterPanel";
import NotaTagihan, { NotaStyles } from "../../components/NotaTagihan";


// ─── Halaman Detail Nota ──────────────────────────────────────────────────────
export default function NotaPetugas() {
    const { id } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [showBtPanel, setShowBtPanel] = useState(false);
    const [printingBt, setPrintingBt] = useState(false);
    const [btMsg, setBtMsg] = useState("");

    const { printerInfo, printNota, supported: btSupported, isPairing } = useBluetoothPrinter();

    useEffect(() => {
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
            <Button onClick={() => nav(-1)}>Kembali</Button>
        </div>
    );
    if (!data) return <div className="p-6 text-slate-500">Memuat nota...</div>;

    const { tagihan: t, pelanggan: p, pengaturan: s } = data;

    return (
        <div className="min-h-screen bg-slate-50 pb-6">
            {/* Toolbar */}
            <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                    <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-slate-600 text-sm">
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

                {/* Bluetooth panel toggle */}
                {showBtPanel && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                            <Bluetooth className="w-3.5 h-3.5" /> Printer Bluetooth
                        </div>
                        <BluetoothPrinterPanel compact />
                    </div>
                )}

                {/* Tombol cetak Bluetooth */}
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

            {/* NOTA — pakai komponen terpusat */}
            <div className="p-4 flex justify-center">
                <NotaTagihan tagihan={t} pelanggan={p} pengaturan={s} />
            </div>

            {/* CSS terpusat dari NotaTagihan */}
            <NotaStyles />
        </div>
    );
}

// ─── List Tagihan untuk petugas cetak nota ────────────────────────────────────
export function PetugasNotaList() {
    const nav = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("SEMUA");

    useEffect(() => {
        const params = filter !== "SEMUA" ? { status: filter } : {};
        setLoading(true);
        api.get("/tagihan_list", { params })
            .then(r => setItems(r.data.data.slice(0, 50)))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [filter]);

    return (
        <div className="min-h-screen bg-slate-50 pb-6">
            <header className="px-5 py-5 bg-[hsl(var(--sidebar))] text-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => nav(-1)} className="text-white/70">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="font-semibold text-lg">Cetak Nota</div>
                        <div className="text-xs text-slate-300">Pilih tagihan untuk dicetak</div>
                    </div>
                </div>
            </header>

            <div className="p-4 space-y-3">
                {/* Filter */}
                <div className="flex gap-2">
                    {["SEMUA", "BELUM", "LUNAS"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                filter === f
                                    ? "bg-[hsl(var(--primary))] text-white border-transparent"
                                    : "bg-white text-slate-600 border-slate-200"
                            }`}
                        >
                            {f === "SEMUA" ? "Semua" : f === "BELUM" ? "Belum Bayar" : "Lunas"}
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="text-slate-400 text-sm text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Memuat tagihan...
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="text-slate-400 text-sm text-center py-8">
                        Tidak ada tagihan{filter !== "SEMUA" ? " " + filter.toLowerCase() : ""}.
                    </div>
                )}

                {items.map(t => (
                    <Card
                        key={t.id}
                        className="p-3 border-slate-200 flex items-center gap-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
                        onClick={() => nav(`/petugas/nota/${t.id}`)}
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{t.nama_pelanggan}</div>
                            <div className="text-xs text-slate-500">
                                {t.rt} · {formatPeriode(t.periode_bulan)} · <span className="font-mono text-[10px]">{t.nomor_tagihan}</span>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <Badge className={
                                t.status_bayar === "LUNAS"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-50"
                            }>
                                {t.status_bayar === "LUNAS" ? "Lunas" : "Belum"}
                            </Badge>
                            <div className="text-xs font-semibold text-slate-700 mt-1">
                                {formatRupiah(t.total_tagihan)}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}