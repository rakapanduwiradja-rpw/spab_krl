import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function Pengaturan() {
    const [s, setS] = useState({});

    useEffect(() => {
        api.get("/pengaturan").then((r) => setS(r.data.data || {}));
    }, []);

    const setK = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

    const uploadQris = async (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setK("qris_image")(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const simpan = async () => {
        try {
            await api.put("/pengaturan", {
                nama_spab: s.nama_spab,
                alamat_spab: s.alamat_spab,
                no_rekening: s.no_rekening,
                nama_bank: s.nama_bank,
                biaya_admin: Number(s.biaya_admin ?? 0),
                qris_image: s.qris_image,
                no_telepon_admin: s.no_telepon_admin,
            });
            toast.success("Pengaturan disimpan");
        } catch (ex) {
            toast.error(formatApiError(ex));
        }
    };

    return (
        <div className="space-y-6 max-w-3xl" data-testid="pengaturan-page">
            <div>
                <h1 className="text-2xl font-semibold">Pengaturan Sistem</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Atur nama SPAB, biaya admin, nomor rekening, dan QRIS
                    statis.
                </p>
            </div>
            <Card className="p-6 border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <Label>Nama SPAB</Label>
                        <Input
                            className="mt-1.5"
                            value={s.nama_spab || ""}
                            onChange={(e) => setK("nama_spab")(e.target.value)}
                            data-testid="input-nama-spab"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Alamat</Label>
                        <Input
                            className="mt-1.5"
                            value={s.alamat_spab || ""}
                            onChange={(e) =>
                                setK("alamat_spab")(e.target.value)
                            }
                        />
                    </div>
                    <div>
                        <Label>Nama Bank</Label>
                        <Input
                            className="mt-1.5"
                            value={s.nama_bank || ""}
                            onChange={(e) => setK("nama_bank")(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>No. Rekening</Label>
                        <Input
                            className="mt-1.5 font-mono"
                            value={s.no_rekening || ""}
                            onChange={(e) =>
                                setK("no_rekening")(e.target.value)
                            }
                        />
                    </div>
                    <div>
                        <Label>Biaya Admin / Abonemen (Rp)</Label>
                        <Input
                            type="number"
                            className="mt-1.5"
                            value={s.biaya_admin ?? 0}
                            onChange={(e) =>
                                setK("biaya_admin")(e.target.value)
                            }
                            data-testid="input-biaya-admin"
                        />
                    </div>
                    <div>
                        <Label>WhatsApp Admin (62...)</Label>
                        <Input
                            className="mt-1.5 font-mono"
                            value={s.no_telepon_admin || ""}
                            onChange={(e) =>
                                setK("no_telepon_admin")(e.target.value)
                            }
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-6 border-slate-200">
                <h2 className="font-semibold mb-2">QRIS Statis</h2>
                <p className="text-xs text-slate-500 mb-4">
                    Upload gambar QRIS statis merchant SPAB. Ini akan
                    ditampilkan pada nota & halaman bayar petugas.
                </p>
                <div className="flex flex-wrap items-start gap-5">
                    <div className="w-40 h-40 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden bg-slate-50">
                        {s.qris_image ? (
                            <img
                                src={s.qris_image}
                                alt="QRIS"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="text-xs text-slate-400 text-center px-3">
                                Belum ada QRIS
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm cursor-pointer hover:bg-slate-800">
                            <Upload className="w-4 h-4" /> Pilih Gambar QRIS
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                    uploadQris(e.target.files?.[0])
                                }
                                data-testid="input-qris-upload"
                            />
                        </label>
                        {s.qris_image && (
                            <Button
                                variant="outline"
                                className="ml-2"
                                onClick={() => setK("qris_image")(null)}
                            >
                                Hapus
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            <div>
                <Button
                    onClick={simpan}
                    className="bg-[hsl(var(--primary))]"
                    data-testid="btn-simpan-pengaturan"
                >
                    Simpan Pengaturan
                </Button>
            </div>
        </div>
    );
}
