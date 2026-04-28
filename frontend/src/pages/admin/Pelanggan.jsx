import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Link } from "react-router-dom";
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
import { Plus, Search } from "lucide-react";
import { formatDate } from "../../lib/format";

export default function PelangganList() {
    const [items, setItems] = useState([]);
    const [rt, setRt] = useState("ALL");
    const [q, setQ] = useState("");

    const load = async () => {
        const params = {};
        if (rt !== "ALL") params.rt = rt;
        if (q) params.q = q;
        const r = await api.get("/pelanggan", { params });
        setItems(r.data.data);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, [rt]);

    return (
        <div className="space-y-6" data-testid="pelanggan-page">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Manajemen Pelanggan
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Kelola data pelanggan dan QR stiker meteran.
                    </p>
                </div>
                <Link to="/admin/pelanggan/tambah">
                    <Button
                        className="bg-[hsl(var(--primary))]"
                        data-testid="btn-tambah-pelanggan"
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Tambah Pelanggan
                    </Button>
                </Link>
            </div>

            <Card className="p-4 flex flex-wrap gap-3 items-center border-slate-200">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Cari nama / KTP / QR..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && load()}
                        className="pl-9"
                        data-testid="input-search-pelanggan"
                    />
                </div>
                <Select value={rt} onValueChange={setRt}>
                    <SelectTrigger
                        className="w-[140px]"
                        data-testid="select-rt-filter"
                    >
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
                                    QR Code
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Nama
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    RT
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Golongan
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    No. HP
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Terdaftar
                                </th>
                                <th className="py-3 px-4 text-left font-medium">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-10 text-center text-slate-400"
                                    >
                                        Tidak ada pelanggan.
                                    </td>
                                </tr>
                            )}
                            {items.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer"
                                    data-testid={`pel-row-${p.id}`}
                                >
                                    <td className="py-3 px-4 font-mono text-xs text-[hsl(var(--primary))]">
                                        <Link to={`/admin/pelanggan/${p.id}`}>
                                            {p.qr_code}
                                        </Link>
                                    </td>
                                    <td className="py-3 px-4 font-medium">
                                        <Link to={`/admin/pelanggan/${p.id}`}>
                                            {p.nama}
                                        </Link>
                                    </td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline">{p.rt}</Badge>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">
                                        {(p.golongan || "").replace("_", " ")}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                                        {p.no_telepon}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500">
                                        {formatDate(p.tanggal_daftar)}
                                    </td>
                                    <td className="py-3 px-4">
                                        {p.status_aktif ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                                Aktif
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Non-aktif
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
