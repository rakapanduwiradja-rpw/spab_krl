import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { formatRupiah, formatDate } from "../../lib/format";
import { toast } from "sonner";

export default function Tarif() {
    const [items, setItems] = useState([]);
    const [harga, setHarga] = useState("");

    const load = () =>
        api.get("/tarif_list").then((r) => setItems(r.data.data));
    useEffect(() => {
        load();
    }, []);

    const simpan = async () => {
        try {
            await api.post("/tarif_create", { harga_per_m3: Number(harga || 0) });
            toast.success("Tarif baru disimpan");
            setHarga("");
            load();
        } catch (ex) {
            toast.error(formatApiError(ex));
        }
    };

    return (
        <div className="space-y-6" data-testid="tarif-page">
            <div>
                <h1 className="text-2xl font-semibold">Manajemen Tarif</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Atur tarif harga per m³ air.
                </p>
            </div>

            <Card className="p-5 border-slate-200 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px]">
                    <Label>Harga per m³ (Rp)</Label>
                    <Input
                        type="number"
                        value={harga}
                        onChange={(e) => setHarga(e.target.value)}
                        placeholder="cth: 4000"
                        className="mt-1.5"
                        data-testid="input-tarif"
                    />
                </div>
                <Button
                    onClick={simpan}
                    className="bg-[hsl(var(--primary))]"
                    data-testid="btn-simpan-tarif"
                >
                    Simpan Tarif Baru
                </Button>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 font-semibold">
                    Histori Tarif
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="py-2.5 px-4 text-left font-medium">
                                Harga
                            </th>
                            <th className="py-2.5 px-4 text-left font-medium">
                                Berlaku Mulai
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((t) => (
                            <tr key={t.id} className="border-t border-slate-100">
                                <td className="py-2.5 px-4 font-semibold">
                                    {formatRupiah(t.harga_per_m3)}/m³
                                </td>
                                <td className="py-2.5 px-4 text-slate-500">
                                    {formatDate(t.berlaku_mulai)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
