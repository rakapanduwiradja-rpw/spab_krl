import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { formatRupiah, waLink } from "../../lib/format";
import { toast } from "sonner";
import {
    ArrowLeft,
    CheckCircle2,
    Copy,
    MessageCircle,
    Printer,
    Loader2,
    QrCode,
    Wallet,
    Landmark,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const TABS = [
    { key: "QRIS", label: "QRIS", icon: QrCode },
    { key: "TUNAI", label: "Tunai", icon: Wallet },
    { key: "TRANSFER", label: "Transfer", icon: Landmark },
];

export default function Bayar() {
    const { id } = useParams();
    const nav = useNavigate();
    const [bundle, setBundle] = useState(null);
    const [metode, setMetode] = useState("QRIS");
    const [uangTerima, setUangTerima] = useState("");
    const [sukses, setSukses] = useState(null);
    const [loading, setLoading] = useState(false);
    const [nominal, setNominal] = useState(0);

    useEffect(() => {
        api.get(`/tagihan/${id}`).then((r) => {
            setBundle(r.data.data);
            setNominal(
                Number(
                    r.data.data.tagihan.sisa_tagihan ??
                        r.data.data.tagihan.total_tagihan,
                ),
            );
        });
    }, [id]);

    if (!bundle)
        return (
            <div className="p-6 text-slate-500" data-testid="bayar-loading">
                Memuat...
            </div>
        );
    const { tagihan: t, pelanggan: p, pengaturan: s } = bundle;

    const konfirmasi = async () => {
        if (!nominal || Number(nominal) <= 0)
            return toast.error("Nominal tidak valid");
        setLoading(true);
        try {
            const r = await api.post(`/tagihan/${id}/bayar`, {
                metode_bayar: metode,
                nominal_bayar: Number(nominal),
            });
            setSukses(r.data.data);
        } catch (ex) {
            toast.error(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    const kembalian =
        metode === "TUNAI" && uangTerima
            ? Math.max(Number(uangTerima) - Number(nominal), 0)
            : 0;
    const kurang = Number(uangTerima || 0) < Number(nominal);
    const kodeUnik = `PLG${p?.qr_code?.split("-").pop() || "0000"}-${new Date().getMonth() + 1}${String(new Date().getFullYear()).slice(-2)}`;

    if (sukses)
        return (
            <SuccessView
                sukses={sukses}
                p={p}
                nav={nav}
                tId={id}
            />
        );

    return (
        <div data-testid="bayar-page">
            <header className="px-5 py-5 bg-[hsl(var(--accent))] text-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => nav(-1)} data-testid="btn-back-bayar">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="font-semibold">Terima Pembayaran</div>
                        <div className="text-xs opacity-90 font-mono">
                            {t.nomor_tagihan}
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="text-sm opacity-90">{p.nama}</div>
                    <div className="text-xs opacity-75">
                        {p.rt} · {p.qr_code}
                    </div>
                </div>
            </header>

            <div className="p-5 space-y-4">
                <Card className="p-4 border-slate-200 spab-shadow">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Biaya air</span>
                        <span>{formatRupiah(t.biaya_air)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-500">Biaya admin</span>
                        <span>{formatRupiah(t.biaya_admin)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-500">Pemakaian</span>
                        <span>{t.pemakaian_m3} m³</span>
                    </div>
                    <div className="border-t mt-3 pt-3 flex justify-between items-end">
                        <span className="text-sm text-slate-600">Total</span>
                        <span className="text-2xl font-bold text-[hsl(var(--primary))]">
                            {formatRupiah(nominal)}
                        </span>
                    </div>
                </Card>

                <div className="grid grid-cols-3 gap-2">
                    {TABS.map((tb) => (
                        <button
                            key={tb.key}
                            onClick={() => setMetode(tb.key)}
                            data-testid={`metode-${tb.key}`}
                            className={`py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 transition-colors ${metode === tb.key ? "bg-[hsl(var(--primary))] text-white" : "bg-slate-100 text-slate-600"}`}
                        >
                            <tb.icon className="w-4 h-4" />
                            {tb.label}
                        </button>
                    ))}
                </div>

                {metode === "QRIS" && (
                    <Card
                        className="p-5 border-slate-200 text-center spab-shadow"
                        data-testid="panel-qris"
                    >
                        <div className="text-xs text-slate-500 mb-2">
                            Scan untuk bayar
                        </div>
                        <div className="mx-auto inline-block p-3 bg-white rounded-xl border">
                            {s?.qris_image ? (
                                <img
                                    src={s.qris_image}
                                    alt="QRIS"
                                    className="w-48 h-48 object-contain"
                                />
                            ) : (
                                <QRCodeSVG
                                    value={`QRIS-${t.nomor_tagihan}-${nominal}`}
                                    size={192}
                                />
                            )}
                        </div>
                        <div className="mt-3 text-2xl font-bold">
                            {formatRupiah(nominal)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                            Diterima di semua bank & e-wallet
                        </div>
                        {!s?.qris_image && (
                            <div className="mt-2 text-[11px] text-amber-600">
                                ⚠ QRIS merchant belum diunggah oleh admin
                            </div>
                        )}
                    </Card>
                )}

                {metode === "TUNAI" && (
                    <Card className="p-4 border-slate-200 space-y-3" data-testid="panel-tunai">
                        <div>
                            <label className="text-sm text-slate-500">
                                Uang diterima
                            </label>
                            <Input
                                type="number"
                                inputMode="numeric"
                                value={uangTerima}
                                onChange={(e) => setUangTerima(e.target.value)}
                                className="mt-1.5 h-14 text-xl font-mono"
                                placeholder="50000"
                                data-testid="input-uang-terima"
                            />
                        </div>
                        <div
                            className={`rounded-lg p-3 text-sm flex justify-between ${kurang ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                        >
                            <span>Kembalian</span>
                            <span className="font-bold">
                                {kurang && uangTerima
                                    ? `Kurang ${formatRupiah(Number(nominal) - Number(uangTerima))}`
                                    : formatRupiah(kembalian)}
                            </span>
                        </div>
                    </Card>
                )}

                {metode === "TRANSFER" && (
                    <Card className="p-4 border-slate-200 space-y-3" data-testid="panel-transfer">
                        <div className="text-sm">
                            <div className="text-slate-500">Rekening tujuan</div>
                            <div className="flex items-center justify-between mt-1">
                                <div>
                                    <div className="font-semibold">
                                        {s?.nama_bank || "Bank BRI"}
                                    </div>
                                    <div className="font-mono">
                                        {s?.no_rekening || "-"}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            s?.no_rekening || "",
                                        );
                                        toast.success("Rekening disalin");
                                    }}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                            <div className="font-semibold">
                                Kode unik: {kodeUnik}
                            </div>
                            <div>
                                Transfer{" "}
                                <span className="font-bold">
                                    {formatRupiah(nominal)}
                                </span>{" "}
                                ke rekening di atas.
                            </div>
                        </div>
                    </Card>
                )}

                <div>
                    <label className="text-xs text-slate-500">
                        Nominal dibayar (bisa diubah untuk bayar sebagian)
                    </label>
                    <Input
                        type="number"
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                        className="mt-1.5 font-mono"
                        data-testid="input-nominal"
                    />
                </div>

                <Button
                    onClick={konfirmasi}
                    disabled={loading}
                    className="w-full h-12 text-base bg-[hsl(var(--primary))]"
                    data-testid="btn-konfirmasi-pembayaran"
                >
                    {loading && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Konfirmasi Pembayaran Diterima
                </Button>
            </div>
        </div>
    );
}

function SuccessView({ sukses, p, nav, tId }) {
    const msg = `Halo ${p.nama}, pembayaran tagihan air Anda sebesar *${formatRupiah(sukses.nominal_terbayar || sukses.total_tagihan)}* telah *${sukses.status_bayar}*. Terima kasih 🙏\n\nNo. tagihan: ${sukses.nomor_tagihan}`;
    return (
        <div
            className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center"
            data-testid="bayar-sukses"
        >
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">Pembayaran Berhasil!</h1>
            <p className="text-slate-500 mt-1 text-sm">
                Terima kasih, pembayaran sudah dicatat.
            </p>
            <div className="mt-6 w-full max-w-xs bg-slate-50 rounded-xl p-4 text-left text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">No. Transaksi</span>
                    <span className="font-mono text-xs">
                        {sukses.nomor_tagihan}
                    </span>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold">{sukses.status_bayar}</span>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Metode</span>
                    <span>{sukses.metode_bayar}</span>
                </div>
            </div>
            <div className="flex gap-2 mt-6 w-full max-w-xs">
                <Link
                    to={`/petugas`}
                    className="flex-1"
                    data-testid="btn-sukses-selesai"
                >
                    <Button variant="outline" className="w-full">
                        Selesai
                    </Button>
                </Link>
                <a
                    href={waLink(p.no_telepon, msg)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1"
                    data-testid="btn-sukses-wa"
                >
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                        <MessageCircle className="w-4 h-4 mr-1.5" /> Kirim Nota
                        WA
                    </Button>
                </a>
            </div>
        </div>
    );
}
