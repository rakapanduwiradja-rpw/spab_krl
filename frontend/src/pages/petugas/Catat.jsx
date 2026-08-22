import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { formatRupiah, formatNumber, formatPeriode } from "../../lib/format";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, AlertCircle, AlertTriangle } from "lucide-react";

export default function Catat() {
    const { qr } = useParams();
    const [searchParams] = useSearchParams();
    const _now = new Date();
    const _defPeriode = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-01T00:00:00+00:00`;
    const periode = searchParams.get("periode") || _defPeriode;
    const nav = useNavigate();
    const [info, setInfo] = useState(null);
    const [err, setErr] = useState("");
    const [errDetail, setErrDetail] = useState("");
    const [duplikat, setDuplikat] = useState(false);
    const [angka, setAngka] = useState("");
    const [foto, setFoto] = useState(null);
    const [catatan, setCatatan] = useState("");
    const [tarif, setTarif] = useState(4000);
    const [biayaAdmin, setBiayaAdmin] = useState(5000);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        // Debug: tampilkan token di console
        const token = localStorage.getItem("spab_id_token");
        const user = localStorage.getItem("spab_user");
        console.log("[SPAB Debug] QR:", qr);
        console.log("[SPAB Debug] Token ada:", !!token);
        console.log("[SPAB Debug] Token (10 char):", token ? token.substring(0, 10) + "..." : "KOSONG");
        console.log("[SPAB Debug] User:", user);

        api.get("/meteran_scan", { params: { qr } })
            .then((r) => {
                setInfo(r.data.data);
                if (r.data.data?.sudah_dicatat_periode) setDuplikat(true);
            })
            .catch((ex) => {
                const status = ex?.response?.status;
                const msg = formatApiError(ex);
                console.error("[SPAB Debug] Meteran scan error:", status, msg, ex?.response?.data);
                setErr(msg);
                // Tampilkan detail untuk debugging
                setErrDetail(`Status: ${status || "Network Error (no response)"} | URL: ${ex?.config?.url || "?"} | Token: ${token ? "ADA" : "TIDAK ADA"}`);
            });

        api.get("/tarif_list").then((r) => {
            if (r.data.data?.[0]) setTarif(Number(r.data.data[0].harga_per_m3));
        }).catch(e => console.warn("[SPAB] tarif error:", e?.response?.status));

        api.get("/pengaturan_get").then((r) =>
            setBiayaAdmin(Number(r.data.data?.biaya_admin || 5000))
        ).catch(e => console.warn("[SPAB] pengaturan error:", e?.response?.status));
    }, [qr]);

    const onFoto = (f) => {
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => setFoto(reader.result);
        reader.readAsDataURL(f);
    };

    const simpan = async () => {
        if (!angka) return toast.error("Masukkan angka meter akhir");
        setLoading(true);
        try {
            const r = await api.post("/pencatatan_create", {
                qr_code: qr,
                angka_meter_akhir: Number(angka),
                foto_meter: foto,
                catatan,
                periode: periode,   // ✅ FIX: kirim periode dari query param
            });
            toast.success("Pencatatan disimpan");
            nav(`/petugas/nota/${r.data.data.tagihan.id}`);
        } catch (ex) {
            const msg = formatApiError(ex);
            if (msg.includes("sudah dicatat")) {
                setDuplikat(true);
                toast.error("Pelanggan ini sudah dicatat bulan ini!", { duration: 5000 });
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (err)
        return (
            <div className="p-6 space-y-4">
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="font-semibold text-red-700 mb-1">Error: {err}</div>
                    {errDetail && (
                        <div className="text-xs font-mono text-red-500 break-all">{errDetail}</div>
                    )}
                </div>
                <div className="text-xs text-slate-500">
                    Jika error "Tidak terotentikasi": silakan logout dan login ulang.
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => nav("/petugas/scan")}>Kembali Scan</Button>
                    <Button variant="outline" onClick={() => {
                        localStorage.removeItem("spab_id_token");
                        localStorage.removeItem("spab_user");
                        window.location.href = "/login";
                    }}>Logout & Login Ulang</Button>
                </div>
            </div>
        );

    if (!info)
        return (
            <div className="p-6 flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat data pelanggan...
            </div>
        );

    const pemakaian = angka && Number(angka) >= Number(info.angka_meter_awal)
        ? Number(angka) - Number(info.angka_meter_awal) : 0;
    const biayaAir = Math.round(pemakaian * tarif);
    const estimasi = biayaAir + biayaAdmin;

    return (
        <div data-testid="catat-page">
            <header className="px-5 py-4 bg-[hsl(var(--sidebar))] text-white flex items-center gap-3">
                <button onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></button>
                <div>
                    <div className="font-semibold">Catat Angka Meter</div>
                    <div className="text-xs text-slate-300 font-mono">{qr}</div>
                </div>
                <div className="ml-auto">
                    <span className="text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">
                        {formatPeriode(periode)}
                    </span>
                </div>
            </header>

            <div className="p-5 space-y-4">
                {duplikat && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-semibold text-amber-700">Sudah dicatat bulan ini!</div>
                            <div className="text-xs text-amber-600 mt-0.5">
                                Jika ada kesalahan, minta admin untuk memperbaiki dari dashboard.
                            </div>
                        </div>
                    </div>
                )}

                <Card className="p-4 border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-semibold">{info.pelanggan?.nama}</div>
                            <div className="text-xs text-slate-500">
                                {info.pelanggan?.rt} · {(info.pelanggan?.golongan || "").replace("_", " ")}
                            </div>
                        </div>
                        <Badge variant="outline">{info.pelanggan?.rt}</Badge>
                    </div>
                    {info.total_tunggakan > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                            <div>
                                <div className="font-semibold text-red-700">Ada tunggakan {formatRupiah(info.total_tunggakan)}</div>
                                <div className="text-xs text-red-600">{info.tunggakan_list?.length} periode belum lunas</div>
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-4 border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Meter awal</span>
                        <span className="font-mono font-semibold">{formatNumber(info.angka_meter_awal, 1)} m³</span>
                    </div>
                    <div>
                        <Label>Meter akhir (m³)</Label>
                        <Input
                            type="number" inputMode="decimal" step="0.1"
                            value={angka}
                            onChange={(e) => setAngka(e.target.value)}
                            className="mt-1.5 text-2xl h-14 font-mono"
                            placeholder={`${info.angka_meter_awal}`}
                        />
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Pemakaian</span>
                            <span className="font-semibold">{formatNumber(pemakaian, 2)} m³</span>
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
                            <span className="font-bold text-[hsl(var(--primary))]">{formatRupiah(estimasi)}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-slate-200 space-y-3">
                    <Label>Foto meteran (opsional)</Label>
                    {foto && <img src={foto} alt="meter" className="w-full rounded-lg max-h-64 object-contain bg-slate-100" />}
                    <input type="file" accept="image/*" capture="environment"
                        onChange={(e) => onFoto(e.target.files?.[0])} ref={fileRef} className="hidden" />
                    <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                        <Camera className="w-4 h-4 mr-1.5" /> {foto ? "Ganti Foto" : "Ambil Foto"}
                    </Button>
                    <Textarea placeholder="Catatan (anomali, dll.)" value={catatan}
                        onChange={(e) => setCatatan(e.target.value)} />
                </Card>

                <Button onClick={simpan} disabled={loading || duplikat}
                    className="w-full h-12 text-base bg-[hsl(var(--primary))]">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {duplikat ? `Sudah Dicatat (${formatPeriode(periode)})` : "Simpan & Tagih Pembayaran"}
                </Button>
            </div>
        </div>
    );
}
