import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { printStiker } from "../../components/StikerQR";

export default function TambahPelanggan() {
    const nav = useNavigate();
    const [step, setStep] = useState(1);
    const [saved, setSaved] = useState(null);
    const [loading, setLoading] = useState(false);
    const [f, setF] = useState({
        nama: "",
        nomor_ktp: "",
        no_telepon: "",
        golongan: "RUMAH_TANGGA",
        rt: "RT01",
        alamat: "",
        no_seri_meter: "",
        angka_awal: 0,
    });
    const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

    const next = () => setStep((s) => s + 1);
    const back = () => setStep((s) => s - 1);

    const simpan = async () => {
        setLoading(true);
        try {
            const r = await api.post("/pelanggan", {
                ...f,
                angka_awal: Number(f.angka_awal || 0),
            });
            setSaved(r.data.data);
            toast.success("Pelanggan berhasil didaftarkan");
        } catch (ex) {
            toast.error(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    if (saved) {
        return (
            <div className="p-5 space-y-4" data-testid="tambah-sukses">
                <Card className="p-5 border-slate-200 text-center">
                    <h1 className="font-semibold text-lg">Terdaftar! 🎉</h1>
                    <div className="inline-block p-4 mt-4 bg-white border-2 border-dashed border-slate-300 rounded-xl">
                        <QRCodeSVG value={saved.qr_code} size={140} />
                    </div>
                    <div className="font-semibold mt-3">{saved.nama}</div>
                    <div className="text-xs text-slate-500">
                        {saved.rt} · {saved.qr_code}
                    </div>
                    <Button
                        className="mt-4 w-full bg-[hsl(var(--primary))]"
                        onClick={() => printStiker([saved])}
                    >
                        Cetak Stiker
                    </Button>
                    <Button
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => nav("/petugas")}
                    >
                        Selesai
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div data-testid="tambah-page">
            <header className="px-5 py-4 bg-[hsl(var(--sidebar))] text-white flex items-center gap-3">
                <button onClick={() => nav(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="font-semibold">Tambah Pelanggan</div>
                    <div className="text-xs text-slate-300">
                        Langkah {step} dari 3
                    </div>
                </div>
            </header>
            <div className="p-5 space-y-4">
                <div className="flex gap-1.5">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[hsl(var(--primary))]" : "bg-slate-200"}`}
                        />
                    ))}
                </div>

                {step === 1 && (
                    <Card
                        className="p-4 border-slate-200 space-y-3"
                        data-testid="step-1"
                    >
                        <h2 className="font-semibold">Data Diri</h2>
                        <div>
                            <Label>Nama Lengkap</Label>
                            <Input
                                className="mt-1.5"
                                value={f.nama}
                                onChange={(e) => set("nama")(e.target.value)}
                                data-testid="tp-nama"
                            />
                        </div>
                        <div>
                            <Label>No. KTP (16 digit)</Label>
                            <Input
                                className="mt-1.5 font-mono"
                                minLength={16}
                                maxLength={16}
                                value={f.nomor_ktp}
                                onChange={(e) =>
                                    set("nomor_ktp")(e.target.value)
                                }
                                data-testid="tp-ktp"
                            />
                        </div>
                        <div>
                            <Label>No. WhatsApp</Label>
                            <Input
                                className="mt-1.5 font-mono"
                                value={f.no_telepon}
                                onChange={(e) =>
                                    set("no_telepon")(e.target.value)
                                }
                                data-testid="tp-wa"
                            />
                        </div>
                        <div>
                            <Label>Golongan Tarif</Label>
                            <Select
                                value={f.golongan}
                                onValueChange={set("golongan")}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RUMAH_TANGGA">
                                        Rumah Tangga
                                    </SelectItem>
                                    <SelectItem value="USAHA">Usaha</SelectItem>
                                    <SelectItem value="SOSIAL">
                                        Sosial
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={next}
                            disabled={
                                !f.nama ||
                                f.nomor_ktp.length < 16 ||
                                !f.no_telepon
                            }
                            className="w-full bg-[hsl(var(--primary))]"
                            data-testid="tp-next-1"
                        >
                            Lanjut
                        </Button>
                    </Card>
                )}

                {step === 2 && (
                    <Card
                        className="p-4 border-slate-200 space-y-3"
                        data-testid="step-2"
                    >
                        <h2 className="font-semibold">Lokasi & Meteran</h2>
                        <div>
                            <Label>RT</Label>
                            <Select value={f.rt} onValueChange={set("rt")}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RT01">RT 01</SelectItem>
                                    <SelectItem value="RT02">RT 02</SelectItem>
                                    <SelectItem value="RT03">RT 03</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Alamat</Label>
                            <Input
                                className="mt-1.5"
                                value={f.alamat}
                                onChange={(e) => set("alamat")(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>No. Seri Meter</Label>
                            <Input
                                className="mt-1.5 font-mono"
                                value={f.no_seri_meter}
                                onChange={(e) =>
                                    set("no_seri_meter")(e.target.value)
                                }
                                data-testid="tp-noseri"
                            />
                        </div>
                        <div>
                            <Label>Angka Awal (m³)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                className="mt-1.5"
                                value={f.angka_awal}
                                onChange={(e) =>
                                    set("angka_awal")(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={back}
                                className="flex-1"
                            >
                                Kembali
                            </Button>
                            <Button
                                onClick={next}
                                disabled={!f.no_seri_meter}
                                className="flex-1 bg-[hsl(var(--primary))]"
                                data-testid="tp-next-2"
                            >
                                Lanjut
                            </Button>
                        </div>
                    </Card>
                )}

                {step === 3 && (
                    <Card
                        className="p-4 border-slate-200 space-y-2 text-sm"
                        data-testid="step-3"
                    >
                        <h2 className="font-semibold mb-2">Konfirmasi</h2>
                        {[
                            ["Nama", f.nama],
                            ["KTP", f.nomor_ktp],
                            ["WhatsApp", f.no_telepon],
                            ["Golongan", f.golongan.replace("_", " ")],
                            ["RT", f.rt],
                            ["Alamat", f.alamat || "-"],
                            ["No. Meter", f.no_seri_meter],
                            ["Angka Awal", `${f.angka_awal} m³`],
                        ].map(([k, v]) => (
                            <div
                                key={k}
                                className="flex justify-between border-b last:border-0 py-1.5"
                            >
                                <span className="text-slate-500">{k}</span>
                                <span className="font-medium">{v}</span>
                            </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={back}
                                className="flex-1"
                            >
                                Kembali
                            </Button>
                            <Button
                                onClick={simpan}
                                disabled={loading}
                                className="flex-1 bg-[hsl(var(--primary))]"
                                data-testid="tp-simpan"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 mr-1.5" />
                                )}
                                Simpan
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
