import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
    formatRupiah,
    formatDateTime,
    formatPeriode,
} from "../../lib/format";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "../../components/ui/tabs";

export default function Riwayat() {
    const [catat, setCatat] = useState([]);
    const [bayar, setBayar] = useState([]);

    useEffect(() => {
        const curr = new Date();
        const iso = new Date(
            Date.UTC(curr.getFullYear(), curr.getMonth(), 1),
        ).toISOString();
        api.get(`/pencatatan?periode=${iso}`).then((r) =>
            setCatat(r.data.data.slice(0, 30)),
        );
        api.get(`/tagihan?status=LUNAS`).then((r) =>
            setBayar(r.data.data.slice(0, 30)),
        );
    }, []);

    return (
        <div data-testid="riwayat-page">
            <header className="px-5 py-5 bg-[hsl(var(--sidebar))] text-white">
                <div className="font-semibold text-lg">Riwayat</div>
                <div className="text-xs text-slate-300">
                    Aktivitas pencatatan dan pembayaran.
                </div>
            </header>

            <div className="p-5">
                <Tabs defaultValue="catat">
                    <TabsList
                        className="grid w-full grid-cols-2"
                        data-testid="riwayat-tabs"
                    >
                        <TabsTrigger value="catat">Pencatatan</TabsTrigger>
                        <TabsTrigger value="bayar">Pembayaran</TabsTrigger>
                    </TabsList>
                    <TabsContent value="catat" className="mt-4 space-y-2">
                        {catat.length === 0 && (
                            <div className="text-sm text-slate-400 text-center py-8">
                                Belum ada pencatatan bulan ini.
                            </div>
                        )}
                        {catat.map((c) => (
                            <Card
                                key={c.id}
                                className="p-3 border-slate-200 flex items-center gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">
                                        {c.nama_pelanggan}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {c.rt} · {formatDateTime(c.waktu_catat)}
                                    </div>
                                </div>
                                {c.is_anomali && (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 mr-2">
                                        Anomali
                                    </Badge>
                                )}
                                <div className="font-semibold text-sm">
                                    {c.pemakaian_m3} m³
                                </div>
                            </Card>
                        ))}
                    </TabsContent>
                    <TabsContent value="bayar" className="mt-4 space-y-2">
                        {bayar.length === 0 && (
                            <div className="text-sm text-slate-400 text-center py-8">
                                Belum ada pembayaran.
                            </div>
                        )}
                        {bayar.map((t) => (
                            <Card
                                key={t.id}
                                className="p-3 border-slate-200 flex items-center gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">
                                        {t.nama_pelanggan}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {t.rt} ·{" "}
                                        {formatPeriode(t.periode_bulan)} ·{" "}
                                        {t.metode_bayar || "-"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-sm text-emerald-600">
                                        {formatRupiah(t.total_tagihan)}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
