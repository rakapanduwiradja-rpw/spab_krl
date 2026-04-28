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
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer } from "lucide-react";
import { printStiker } from "../../components/StikerQR";

export default function PelangganForm() {
    const nav = useNavigate();
    const [f, setF] = useState({
        nama: "",
        nomor_ktp: "",
        no_telepon: "",
        alamat: "",
        rt: "RT01",
        golongan: "RUMAH_TANGGA",
        no_seri_meter: "",
        angka_awal: 0,
    });
    const [saved, setSaved] = useState(null);
    const [loading, setLoading] = useState(false);

    const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const r = await api.post("/pelanggan", {
                ...f,
                angka_awal: Number(f.angka_awal || 0),
            });
            setSaved(r.data.data);
            toast.success("Pelanggan berhasil ditambahkan");
        } catch (ex) {
            toast.error(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    if (saved) {
        return (
            <div
                className="max-w-lg mx-auto space-y-5"
                data-testid="pelanggan-saved"
            >
                <Card className="p-6 text-center border-slate-200">
                    <h1 className="text-xl font-semibold">
                        Pelanggan Terdaftar 🎉
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Berikut stiker QR untuk dipasang di meteran.
                    </p>
                    <div className="bg-white mx-auto mt-6 p-5 border-2 border-dashed border-slate-300 rounded-xl inline-block">
                        <div className="text-xs font-semibold text-[hsl(var(--primary))] mb-2">
                            💧 SPAB KRL RAGAM BERSERI
                        </div>
                        <QRCodeSVG value={saved.qr_code} size={140} />
                        <div className="mt-3 font-semibold">{saved.nama}</div>
                        <div className="text-xs text-slate-500">
                            {saved.rt} · {saved.qr_code}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {saved.no_seri_meter}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-center mt-6">
                        <Button
                            onClick={() => printStiker([saved])}
                            data-testid="btn-print-stiker"
                        >
                            <Printer className="w-4 h-4 mr-1.5" />
                            Cetak Stiker
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => nav("/admin/pelanggan")}
                        >
                            Kembali
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="max-w-2xl mx-auto space-y-5">
            <div>
                <h1 className="text-2xl font-semibold">Tambah Pelanggan</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Isi data pelanggan & meteran. QR code akan otomatis
                    digenerate.
                </p>
            </div>
            <Card className="p-6 space-y-4 border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <Label>Nama Lengkap</Label>
                        <Input
                            required
                            className="mt-1.5"
                            value={f.nama}
                            onChange={(e) => set("nama")(e.target.value)}
                            data-testid="form-nama"
                        />
                    </div>
                    <div>
                        <Label>No. KTP (16 digit)</Label>
                        <Input
                            required
                            minLength={16}
                            maxLength={16}
                            className="mt-1.5 font-mono"
                            value={f.nomor_ktp}
                            onChange={(e) => set("nomor_ktp")(e.target.value)}
                            data-testid="form-ktp"
                        />
                    </div>
                    <div>
                        <Label>No. WhatsApp</Label>
                        <Input
                            required
                            className="mt-1.5 font-mono"
                            placeholder="081..."
                            value={f.no_telepon}
                            onChange={(e) => set("no_telepon")(e.target.value)}
                            data-testid="form-telepon"
                        />
                    </div>
                    <div>
                        <Label>RT</Label>
                        <Select value={f.rt} onValueChange={set("rt")}>
                            <SelectTrigger
                                className="mt-1.5"
                                data-testid="form-rt"
                            >
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
                        <Label>Golongan</Label>
                        <Select
                            value={f.golongan}
                            onValueChange={set("golongan")}
                        >
                            <SelectTrigger
                                className="mt-1.5"
                                data-testid="form-golongan"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RUMAH_TANGGA">
                                    Rumah Tangga
                                </SelectItem>
                                <SelectItem value="USAHA">Usaha</SelectItem>
                                <SelectItem value="SOSIAL">Sosial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Alamat</Label>
                        <Input
                            className="mt-1.5"
                            value={f.alamat}
                            onChange={(e) => set("alamat")(e.target.value)}
                            data-testid="form-alamat"
                        />
                    </div>
                    <div>
                        <Label>No. Seri Meteran</Label>
                        <Input
                            required
                            className="mt-1.5 font-mono"
                            value={f.no_seri_meter}
                            onChange={(e) =>
                                set("no_seri_meter")(e.target.value)
                            }
                            data-testid="form-noseri"
                        />
                    </div>
                    <div>
                        <Label>Angka Awal Meter (m³)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            className="mt-1.5"
                            value={f.angka_awal}
                            onChange={(e) => set("angka_awal")(e.target.value)}
                            data-testid="form-angka-awal"
                        />
                    </div>
                </div>
            </Card>
            <div className="flex gap-2">
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[hsl(var(--primary))]"
                    data-testid="btn-simpan-pelanggan"
                >
                    {loading && (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    )}
                    Simpan & Generate QR
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => nav(-1)}
                >
                    Batal
                </Button>
            </div>
        </form>
    );
}
