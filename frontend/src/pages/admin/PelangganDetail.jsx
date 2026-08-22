import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { formatRupiah, formatPeriode, formatDate, formatNumber, waLink } from "../../lib/format";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, MessageCircle, Printer, Pencil, Trash2, AlertTriangle, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const GOLONGAN = ["RUMAH_TANGGA", "USAHA_KECIL", "USAHA_MENENGAH", "INSTANSI"];
const RT_LIST = ["RT01", "RT02", "RT03"];

export function StatusBadge({ s }) {
    const map = {
        LUNAS: "bg-emerald-50 text-emerald-700 border-emerald-200",
        SEBAGIAN: "bg-amber-50 text-amber-700 border-amber-200",
        BELUM: "bg-red-50 text-red-600 border-red-200",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[s] || "bg-slate-100 text-slate-600"}`}>
            {s}
        </span>
    );
}

export default function PelangganDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [nonaktifOpen, setNonaktifOpen] = useState(false);
    const [hapusOpen, setHapusOpen] = useState(false);
    const [konfirmasiHapus, setKonfirmasiHapus] = useState("");
    const [editCatat, setEditCatat] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = () => api.get("/pelanggan_detail", { params: { id } })
        .then(r => setData(r.data.data))
        .catch(ex => toast.error(formatApiError(ex)));

    useEffect(() => { load(); }, [id]);

    if (!data) return <div className="text-slate-500 p-6">Memuat...</div>;
    const { pelanggan: p, pencatatan, tagihan } = data;

    const chart = [...pencatatan].reverse().map(c => ({
        label: formatPeriode(c.periode_bulan),
        pemakaian: Number(c.pemakaian_m3),
    }));

    const bukaEdit = () => {
        setEditForm({
            nama: p.nama, nomor_ktp: p.nomor_ktp, rt: p.rt,
            no_telepon: p.no_telepon, alamat: p.alamat,
            golongan: p.golongan, status_aktif: p.status_aktif,
            no_seri_meter: p.no_seri_meter,
        });
        setEditOpen(true);
    };

    const simpanEdit = async () => {
        setLoading(true);
        try {
            await api.put("/pelanggan_update", editForm, { params: { id } });
            toast.success("Data pelanggan diperbarui");
            setEditOpen(false);
            load();
        } catch (ex) { toast.error(formatApiError(ex)); }
        finally { setLoading(false); }
    };

    const nonaktifkan = async () => {
        setLoading(true);
        try {
            await api.put("/pelanggan_update", { status_aktif: false }, { params: { id } });
            toast.success("Pelanggan dinonaktifkan");
            setNonaktifOpen(false);
            load();
        } catch (ex) { toast.error(formatApiError(ex)); }
        finally { setLoading(false); }
    };

    const aktifkan = async () => {
        setLoading(true);
        try {
            await api.put("/pelanggan_update", { status_aktif: true }, { params: { id } });
            toast.success("Pelanggan diaktifkan");
            load();
        } catch (ex) { toast.error(formatApiError(ex)); }
        finally { setLoading(false); }
    };

    const hapusPermanent = async () => {
        if (konfirmasiHapus !== p.nama) {
            toast.error("Nama tidak cocok");
            return;
        }
        setLoading(true);
        try {
            await api.post("/pelanggan_hapus", {}, { params: { id } });
            toast.success("Pelanggan berhasil dihapus permanen");
            nav("/admin/pelanggan");
        } catch (ex) { toast.error(formatApiError(ex)); }
        finally { setLoading(false); }
    };

    const hapusCatat = async (cid) => {
        if (!window.confirm("Hapus pencatatan ini? Tagihan terkait juga akan dihapus.")) return;
        setLoading(true);
        try {
            await api.post("/pencatatan_hapus", {}, { params: { id: cid } });
            toast.success("Pencatatan dihapus");
            load();
        } catch (ex) { toast.error(formatApiError(ex)); }
        finally { setLoading(false); }
    };

    const simpanEditCatat = async () => {
        if (!editCatat) return;
        setLoading(true);
        try {
            await api.put("/pencatatan_update", {
                angka_meter_akhir: Number(editCatat.angka_meter_akhir),
                catatan: editCatat.catatan,
            }, { params: { id: editCatat.id } });
            toast.success("Pencatatan diperbarui");
            setEditCatat(null);
            load();
        } catch (ex) { toast.error(formatApiError(ex)); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <Link to="/admin/pelanggan"
                    className="text-sm text-slate-500 inline-flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </Link>
                <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={bukaEdit}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    {p.status_aktif ? (
                        <Button size="sm" variant="outline"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => setNonaktifOpen(true)}>
                            <PowerOff className="w-3.5 h-3.5 mr-1" /> Nonaktifkan
                        </Button>
                    ) : (
                        <Button size="sm" variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={aktifkan}>
                            Aktifkan Kembali
                        </Button>
                    )}
                    <Button size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => { setKonfirmasiHapus(""); setHapusOpen(true); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Permanen
                    </Button>
                </div>
            </div>

            {/* Info pelanggan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5 border-slate-200 col-span-2 space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-semibold">{p.nama}</div>
                            <div className="text-sm text-slate-500 font-mono">{p.qr_code}</div>
                        </div>
                        <Badge className={p.status_aktif
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-600 border-red-200"}>
                            {p.status_aktif ? "Aktif" : "Non-aktif"}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                        {[
                            ["RT", p.rt], ["KTP", p.nomor_ktp],
                            ["Telepon", p.no_telepon],
                            ["Golongan", (p.golongan || "").replace("_", " ")],
                            ["Alamat", p.alamat], ["No. Meter", p.no_seri_meter],
                            ["Daftar", formatDate(p.tanggal_daftar)],
                            ["Meter terakhir", `${formatNumber(p.angka_meter_terakhir, 1)} m³`],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <div className="text-xs text-slate-400">{k}</div>
                                <div className="font-medium">{v || "-"}</div>
                            </div>
                        ))}
                    </div>
                    {p.no_telepon && (
                        <a href={`https://wa.me/${p.no_telepon}?text=Halo%20${encodeURIComponent(p.nama)}`}
                            target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                                <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                            </Button>
                        </a>
                    )}
                </Card>

                <Card className="p-5 border-slate-200 flex flex-col items-center justify-center gap-3">
                    <QRCodeSVG value={p.qr_code} size={140} />
                    <div className="text-xs font-mono text-slate-500">{p.qr_code}</div>
                </Card>
            </div>

            {/* Chart */}
            {chart.length > 0 && (
                <Card className="p-5 border-slate-200">
                    <div className="font-semibold mb-4 text-sm">Riwayat Pemakaian</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chart}>
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={v => [`${v} m³`]} />
                            <Line type="monotone" dataKey="pemakaian"
                                stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Riwayat pencatatan */}
            <Card className="border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">
                    Riwayat Pencatatan
                    {pencatatan.length === 0 && (
                        <span className="ml-2 text-slate-400 font-normal text-xs">
                            (Belum ada pencatatan)
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-2 px-4 text-left font-medium">Periode</th>
                                <th className="py-2 px-4 text-right font-medium">Meter Awal</th>
                                <th className="py-2 px-4 text-right font-medium">Meter Akhir</th>
                                <th className="py-2 px-4 text-right font-medium">Pakai</th>
                                <th className="py-2 px-4 text-center font-medium">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pencatatan.map(c => (
                                <tr key={c.id} className="border-t border-slate-100">
                                    <td className="py-2 px-4">
                                        {formatPeriode(c.periode_bulan)}
                                        {c.is_anomali && (
                                            <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1 rounded">
                                                ⚠ Anomali
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono">
                                        {formatNumber(c.angka_meter_awal, 1)}
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono">
                                        {formatNumber(c.angka_meter_akhir, 1)}
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono">
                                        {formatNumber(c.pemakaian_m3, 2)} m³
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <Button size="sm" variant="outline"
                                                onClick={() => setEditCatat({ ...c })}>
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => hapusCatat(c.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pencatatan.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                                        Belum ada pencatatan untuk pelanggan ini
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Tagihan */}
            <Card className="border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">Tagihan</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="py-2 px-4 text-left font-medium">Periode</th>
                                <th className="py-2 px-4 text-right font-medium">Total</th>
                                <th className="py-2 px-4 text-center font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tagihan.map(t => (
                                <tr key={t.id} className="border-t border-slate-100">
                                    <td className="py-2 px-4">{formatPeriode(t.periode_bulan)}</td>
                                    <td className="py-2 px-4 text-right font-mono">
                                        {formatRupiah(t.total_tagihan)}
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                        <StatusBadge s={t.status_bayar} />
                                    </td>
                                </tr>
                            ))}
                            {tagihan.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-6 text-center text-slate-400">
                                        Belum ada tagihan
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Dialog Edit Pelanggan */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Edit Data Pelanggan</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-2">
                        {[["nama","Nama"],["nomor_ktp","No. KTP"],["no_telepon","No. Telepon"],
                          ["alamat","Alamat"],["no_seri_meter","No. Seri Meter"]].map(([k,lbl]) => (
                            <div key={k} className={k === "alamat" ? "col-span-2" : ""}>
                                <Label>{lbl}</Label>
                                <Input className="mt-1" value={editForm[k] || ""}
                                    onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} />
                            </div>
                        ))}
                        <div>
                            <Label>RT</Label>
                            <Select value={editForm.rt}
                                onValueChange={v => setEditForm(p => ({ ...p, rt: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {RT_LIST.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Golongan</Label>
                            <Select value={editForm.golongan}
                                onValueChange={v => setEditForm(p => ({ ...p, golongan: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {GOLONGAN.map(g => (
                                        <SelectItem key={g} value={g}>{g.replace("_"," ")}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
                        <Button onClick={simpanEdit} disabled={loading}
                            className="bg-[hsl(var(--primary))]">
                            {loading ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit Pencatatan */}
            <Dialog open={!!editCatat} onOpenChange={o => !o && setEditCatat(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Koreksi Pencatatan — {editCatat && formatPeriode(editCatat.periode_bulan)}</DialogTitle>
                    </DialogHeader>
                    {editCatat && (
                        <div className="space-y-3 py-2">
                            <div className="text-sm text-slate-500">
                                Meter awal: <span className="font-mono font-semibold">
                                    {formatNumber(editCatat.angka_meter_awal, 1)} m³
                                </span>
                            </div>
                            <div>
                                <Label>Angka Meter Akhir (m³)</Label>
                                <Input type="number" step="0.1" className="mt-1.5 font-mono"
                                    value={editCatat.angka_meter_akhir}
                                    onChange={e => setEditCatat(p => ({ ...p, angka_meter_akhir: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Catatan</Label>
                                <Input className="mt-1.5" value={editCatat.catatan || ""}
                                    onChange={e => setEditCatat(p => ({ ...p, catatan: e.target.value }))} />
                            </div>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Mengubah angka meter akan mempengaruhi perhitungan tagihan.
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCatat(null)}>Batal</Button>
                        <Button onClick={simpanEditCatat} disabled={loading}
                            className="bg-[hsl(var(--primary))]">
                            {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Nonaktifkan */}
            <Dialog open={nonaktifOpen} onOpenChange={setNonaktifOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nonaktifkan Pelanggan</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600 py-2">
                        Pelanggan <strong>{p.nama}</strong> akan dinonaktifkan.
                        Data tetap tersimpan dan bisa diaktifkan kembali.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNonaktifOpen(false)}>Batal</Button>
                        <Button onClick={nonaktifkan} disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white">
                            {loading ? "Memproses..." : "Nonaktifkan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Hapus Permanen */}
            <Dialog open={hapusOpen} onOpenChange={setHapusOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-red-600">⚠ Hapus Permanen</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-slate-600">
                            Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua data pencatatan
                            dan tagihan milik <strong>{p.nama}</strong> akan dihapus selamanya.
                        </p>
                        <div>
                            <Label className="text-sm">
                                Ketik nama pelanggan <strong className="font-mono">{p.nama}</strong> untuk konfirmasi:
                            </Label>
                            <Input className="mt-2" value={konfirmasiHapus}
                                onChange={e => setKonfirmasiHapus(e.target.value)}
                                placeholder={p.nama} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHapusOpen(false)}>Batal</Button>
                        <Button onClick={hapusPermanent} disabled={loading || konfirmasiHapus !== p.nama}
                            className="bg-red-600 hover:bg-red-700 text-white">
                            {loading ? "Menghapus..." : "Hapus Permanen"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
