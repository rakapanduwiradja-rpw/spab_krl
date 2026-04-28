import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
    formatRupiah,
    formatNumber,
    formatPeriode,
} from "../../lib/format";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, AlertCircle } from "lucide-react";

export default function Catat() {
    const { qr } = useParams();
    const nav = useNavigate();
    const [info, setInfo] = useState(null);
    const [err, setErr] = useState("");
    const [angka, setAngka] = useState("");
    const [foto, setFoto] = useState(null);
    const [catatan, setCatatan] = useState("");
    const [tarif, setTarif] = useState(4000);
    const [biayaAdmin, setBiayaAdmin] = useState(5000);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        api.get(`/meteran/scan/${qr}`)
            .then((r) => setInfo(r.data.data))
            .catch((ex) => setErr(formatApiError(ex)));
        api.get("/tarif").then((r) => {
            if (r.data.data[0]) setTarif(Number(r.data.data[0].harga_per_m3));
        });
        api.get("/pengaturan").then((r) =>
            setBiayaAdmin(Number(r.data.data?.biaya_admin || 5000)),
        );
    }, [qr]);

    const onFoto = (f) => {
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => setFoto(reader.result);
        reader.readAsDataURL(f);
    };

    const simpan = async () => {
        if (!angka) return toast.error("Masukkan angka meter kini");
        setLoading(true);
        try {
            const r = await api.post("/pencatatan", {
                qr_code: qr,
                angka_meter_kini: Number(angka),
                foto_meter: foto,
                catatan,
            });
            toast.success("Pencatatan disimpan");
            nav(`/petugas/bayar/${r.data.data.tagihan.id}`);
        } catch (ex) {
            toast.error(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    if (err)
        return (
            <div className="p-6" data-testid="catat-error">
                <div className="text-red-600 text-sm mb-3">{err}</div>
                <Button onClick={() => nav("/petugas/scan")}>
                    Kembali Scan
                </Button>
            </div>
        );
    if (!info)
        return (
            <div className="p-6 text-slate-500" data-testid="catat-loading">
                Memuat data pelanggan...
            </div>
        );

    const pemakaian =
        angka && Number(angka) >= Number(info.angka_meter_lalu)
            ? Number(angka) - Number(info.angka_meter_lalu)
            : 0;
    const biayaAir = Math.round(pemakaian * tarif);
    const estimasi = biayaAir + biayaAdmin;

    return (
        <div data-testid="catat-page">
            <header className="px-5 py-4 bg-[hsl(var(--sidebar))] text-white flex items-center gap-3">
                <button onClick={() => nav(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="font-semibold">Catat Angka Meter</div>
                    <div className="text-xs text-slate-300 font-mono">
                        {qr}
                    </div>
                </div>
            </header>

            <div className="p-5 space-y-4">
                <Card className="p-4 border-slate-200 spab-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-semibold">
                                {info.pelanggan.nama}
                            </div>
                            <div className="text-xs text-slate-500">
                                {info.pelanggan.rt} ·{" "}
                                {(info.pelanggan.golongan || "").replace("_", " ")}
                            </div>
                        </div>
                        <Badge variant="outline">{info.pelanggan.rt}</Badge>
                    </div>
                    {info.total_tunggakan > 0 && (
                        <div
                            className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm"
                            data-testid="alert-tunggakan"
                        >
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-semibold text-red-700">
                                    Ada tunggakan{" "}
                                    {formatRupiah(info.total_tunggakan)}
                                </div>
                                <div className="text-xs text-red-600">
                                    {info.tunggakan_list.length} periode belum
                                    lunas
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-4 border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                            Meter lalu (
                            {info.periode_lalu
                                ? formatPeriode(info.periode_lalu)
                                : "awal"}
                            )
                        </span>
                        <span className="font-mono font-semibold">
                            {formatNumber(info.angka_meter_lalu, 1)} m³
                        </span>
                    </div>
                    <div>
                        <Label>Meter kini (m³)</Label>
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value={angka}
                            onChange={(e) => setAngka(e.target.value)}
                            className="mt-1.5 text-2xl h-14 font-mono"
                            placeholder={`${info.angka_meter_lalu}`}
                            data-testid="input-meter-kini"
                        />
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Pemakaian</span>
                            <span className="font-semibold">
                                {formatNumber(pemakaian, 2)} m³
                            </span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-slate-600">Biaya air</span>
                            <span>{formatRupiah(biayaAir)}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-slate-600">Biaya admin</span>
                            <span>{formatRupiah(biayaAdmin)}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 text-base">
                            <span className="font-semibold">Estimasi tagihan</span>
                            <span className="font-bold text-[hsl(var(--primary))]">
                                {formatRupiah(estimasi)}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-slate-200 space-y-3">
                    <Label>Foto meteran (opsional)</Label>
                    {foto && (
                        <img
                            src={foto}
                            alt="meter"
                            className="w-full rounded-lg max-h-64 object-contain bg-slate-100"
                        />
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => onFoto(e.target.files?.[0])}
                        ref={fileRef}
                        className="hidden"
                        data-testid="input-foto"
                    />
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileRef.current?.click()}
                        data-testid="btn-foto"
                    >
                        <Camera className="w-4 h-4 mr-1.5" />{" "}
                        {foto ? "Ganti Foto" : "Ambil Foto"}
                    </Button>
                    <Textarea
                        placeholder="Catatan (anomali, dll.)"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        data-testid="input-catatan"
                    />
                </Card>

                <Button
                    onClick={simpan}
                    disabled={loading}
                    className="w-full h-12 text-base bg-[hsl(var(--primary))]"
                    data-testid="btn-simpan-catat"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Simpan & Tagih Pembayaran
                </Button>
            </div>
        </div>
    );
}
