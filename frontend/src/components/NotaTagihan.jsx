import { QRCodeSVG } from "qrcode.react";
import { formatRupiah, formatNumber, formatDate } from "../lib/format";

export default function NotaTagihan({ tagihan: t, pelanggan: p, pengaturan: s }) {
    if (!t) return null;
    return (
        <div
            id="print-area"
            className="bg-white mx-auto p-6 border border-slate-300 rounded-lg"
            style={{ maxWidth: "480px", fontFamily: "DM Sans" }}
        >
            <div className="text-center border-b pb-3">
                <div className="text-lg font-bold text-[hsl(var(--primary))]">
                    💧 SPAB KRL RAGAM BERSERI
                </div>
                <div className="text-xs text-slate-500">
                    {s?.alamat_spab || "Perumahan KRL Ragam Berseri"}
                </div>
                <div className="text-sm font-semibold mt-3">
                    Tagihan Air — {formatPeriodeFull(t.periode_bulan)}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                    No: {t.nomor_tagihan}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-sm mt-3 border-b pb-3">
                <KV k="Nama" v={p?.nama || "-"} />
                <KV k="RT" v={p?.rt || "-"} />
                <KV k="ID" v={p?.qr_code || "-"} mono />
                <KV k="Golongan" v={(p?.golongan || "").replace("_", " ")} />
            </div>

            <div className="text-sm mt-3 border-b pb-3 space-y-1">
                <Row k="Meter lalu" v={`${formatNumber(t.angka_meter_lalu ?? 0, 1)} m³`} />
                <Row k="Meter kini" v={`${formatNumber(t.angka_meter_kini ?? 0, 1)} m³`} />
                <Row k="Pemakaian" v={`${formatNumber(t.pemakaian_m3, 2)} m³`} strong />
            </div>

            <div className="text-sm mt-3 border-b pb-3 space-y-1">
                <Row k="Biaya air" v={formatRupiah(t.biaya_air)} />
                <Row k="Biaya admin" v={formatRupiah(t.biaya_admin)} />
                <Row k="Tarif / m³" v={formatRupiah(t.tarif_per_m3)} muted />
            </div>

            <div className="flex justify-between items-center mt-3 text-base font-bold">
                <span>TOTAL</span>
                <span className="text-[hsl(var(--primary))]">
                    {formatRupiah(t.total_tagihan)}
                </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                    {s?.qris_image ? (
                        <img
                            src={s.qris_image}
                            alt="QRIS"
                            className="w-24 h-24 object-contain rounded border"
                        />
                    ) : (
                        <QRCodeSVG value={t.nomor_tagihan || ""} size={90} />
                    )}
                </div>
                <div className="text-xs text-slate-600">
                    <div className="font-semibold">Pembayaran</div>
                    <div>Scan QRIS atau transfer:</div>
                    <div>
                        {s?.nama_bank || "BRI"} —{" "}
                        <span className="font-mono">
                            {s?.no_rekening || "-"}
                        </span>
                    </div>
                    {t.tanggal_bayar && (
                        <div className="mt-1.5 text-emerald-600 font-semibold">
                            ✓ Lunas {formatDate(t.tanggal_bayar)}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t text-center text-[10px] text-slate-400">
                Terima kasih atas kepercayaan Anda menggunakan layanan SPAB KRL
                Ragam Berseri
            </div>
        </div>
    );
}

function KV({ k, v, mono }) {
    return (
        <div>
            <div className="text-[11px] text-slate-400 uppercase">{k}</div>
            <div className={`${mono ? "font-mono text-xs" : ""}`}>{v}</div>
        </div>
    );
}

function Row({ k, v, strong, muted }) {
    return (
        <div
            className={`flex justify-between ${muted ? "text-slate-400 text-xs" : ""}`}
        >
            <span className={muted ? "" : "text-slate-600"}>{k}</span>
            <span className={strong ? "font-semibold" : ""}>{v}</span>
        </div>
    );
}

function formatPeriodeFull(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const MONTHS = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
    ];
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
