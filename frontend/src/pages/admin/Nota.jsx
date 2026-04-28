import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import NotaTagihan from "../../components/NotaTagihan";
import { Printer, ArrowLeft } from "lucide-react";

export default function Nota() {
    const [sp] = useSearchParams();
    const id = sp.get("id");
    const [bundle, setBundle] = useState(null);

    useEffect(() => {
        if (!id) return;
        api.get(`/tagihan/${id}`).then((r) => setBundle(r.data.data));
    }, [id]);

    if (!id) return <TagihanPicker />;
    if (!bundle) return <div className="text-slate-500">Memuat nota...</div>;

    return (
        <div className="space-y-4" data-testid="nota-page">
            <div className="flex items-center justify-between no-print">
                <Link
                    to="/admin/tagihan"
                    className="text-sm text-slate-500 inline-flex items-center gap-1"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </Link>
                <Button
                    onClick={() => window.print()}
                    className="bg-[hsl(var(--primary))]"
                    data-testid="btn-print-nota"
                >
                    <Printer className="w-4 h-4 mr-1.5" /> Cetak Nota
                </Button>
            </div>
            <NotaTagihan {...bundle} />
        </div>
    );
}

function TagihanPicker() {
    const [items, setItems] = useState([]);
    useEffect(() => {
        api.get("/tagihan").then((r) => setItems(r.data.data.slice(0, 30)));
    }, []);
    return (
        <div className="space-y-5" data-testid="nota-picker">
            <div>
                <h1 className="text-2xl font-semibold">Cetak Nota</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Pilih tagihan untuk dicetak.
                </p>
            </div>
            <Card className="border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="py-3 px-4 text-left font-medium">No.</th>
                            <th className="py-3 px-4 text-left font-medium">
                                Pelanggan
                            </th>
                            <th className="py-3 px-4 text-left font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((t) => (
                            <tr key={t.id} className="border-t border-slate-100">
                                <td className="py-3 px-4 font-mono text-xs">
                                    {t.nomor_tagihan}
                                </td>
                                <td className="py-3 px-4">
                                    {t.nama_pelanggan} · {t.rt}
                                </td>
                                <td className="py-3 px-4">
                                    <Link to={`/admin/nota?id=${t.id}`}>
                                        <Button size="sm" variant="outline">
                                            Buka Nota
                                        </Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
