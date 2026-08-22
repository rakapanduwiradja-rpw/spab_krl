import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { formatRupiah, formatPeriode } from "../../lib/format";
import { toast } from "sonner";
import {
    ArrowLeft,
    Search,
    Loader2,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Clock,
} from "lucide-react";

export default function BayarCari() {
    const nav = useNavigate();
    const [q, setQ] = useState("");
    const [allTagihan, setAllTagihan] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load semua tagihan belum lunas saat halaman dibuka
    useEffect(() => {
        setLoading(true);
        api.get("/tagihan_list", { params: { status: "BELUM" } })
            .then((r) => {
                const data = r.data.data || [];
                setAllTagihan(data);
                setFiltered(data);
            })
            .catch((ex) => toast.error(formatApiError(ex)))
            .finally(() => setLoading(false));
    }, []);

    // Filter lokal saat q berubah
    useEffect(() => {
        const kw = q.trim().toLowerCase();
        if (!kw) {
            setFiltered(allTagihan);
        } else {
            setFiltered(
                allTagihan.filter(
                    (t) =>
                        (t.nama_pelanggan || "").toLowerCase().includes(kw) ||
                        (t.nomor_tagihan || "").toLowerCase().includes(kw) ||
                        (t.rt || "").toLowerCase().includes(kw)
                )
            );
        }
    }, [q, allTagihan]);

    return (
        <div data-testid="bayar-cari-page">
            <header className="px-5 py-4 bg-[hsl(var(--accent))] text-white flex items-center gap-3">
                <button onClick={() => nav(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="font-semibold">Terima Pembayaran</div>
                    <div className="text-xs opacity-80">Tagihan belum lunas</div>
                </div>
                {!loading && (
                    <Badge className="ml-auto bg-white/20 text-white text-[10px]">
                        {filtered.length} tagihan
                    </Badge>
                )}
            </header>

            <div className="p-5 space-y-4">
                {/* Search Box */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari nama, RT, atau no. tagihan..."
                        className="pl-9"
                        data-testid="input-cari-pelanggan"
                    />
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Memuat tagihan...
                    </div>
                )}

                {/* Empty */}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        {q ? `Tidak ada tagihan untuk "${q}"` : "Semua pelanggan sudah lunas 🎉"}
                    </div>
                )}

                {/* List tagihan */}
                {!loading && filtered.length > 0 && (
                    <div className="space-y-2">
                        {filtered.map((t) => (
                            <TagihanCard
                                key={t.id}
                                tagihan={t}
                                onBayar={() => nav(`/petugas/bayar/${t.id}`)}
                            />
                        ))}
                    </div>
                )}

                {/* Scan shortcut */}
                <Button
                    variant="outline"
                    className="w-full border-dashed border-slate-300 text-slate-600"
                    onClick={() => nav("/petugas/scan")}
                >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Atau Scan QR Meteran untuk Catat + Bayar
                </Button>
            </div>
        </div>
    );
}

function TagihanCard({ tagihan: t, onBayar }) {
    const lunas = t.status_bayar === "LUNAS";
    return (
        <Card
            className="p-4 border-slate-200 flex items-center justify-between gap-3"
            data-testid="tagihan-card"
        >
            <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.nama_pelanggan || t.pelanggan?.nama}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {t.rt} · {formatPeriode(t.periode_bulan || t.periode)} · {t.nomor_tagihan}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-base font-bold text-[hsl(var(--primary))]">
                        {formatRupiah(t.sisa_tagihan ?? t.total_tagihan)}
                    </span>
                    {lunas ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> Lunas
                        </Badge>
                    ) : (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">
                            <Clock className="w-3 h-3 mr-0.5" /> Belum
                        </Badge>
                    )}
                </div>
            </div>
            {!lunas && (
                <Button
                    size="sm"
                    className="shrink-0 bg-[hsl(var(--accent))]"
                    onClick={onBayar}
                    data-testid="btn-bayar-tagihan"
                >
                    Bayar
                </Button>
            )}
        </Card>
    );
}
