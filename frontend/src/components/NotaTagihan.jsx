import { QRCodeSVG } from "qrcode.react";
import { formatDate } from "../lib/format";

/**
 * NotaTagihan — tampilan nota 58mm thermal
 * Dipakai di: /admin/nota/:id  dan  /petugas/nota/:id
 *
 * Urutan section IDENTIK dengan buildNotaBytes() di bluetoothPrinter.js:
 *   HEADER → sep= → JUDUL → sep- → STATUS → sep- →
 *   NO TAGIHAN → sep- → PELANGGAN → sep- →
 *   PEMAKAIAN → sep- → BIAYA → sep= →
 *   TOTAL → [sisa] → [lunas info] → sep- →
 *   [transfer+QRIS jika belum lunas] →
 *   QR METERAN → sep-- → FOOTER
 */
export default function NotaTagihan({ tagihan: t, pelanggan: p, pengaturan: s }) {
    if (!t) return null;

    const isLunas  = t.status_bayar === 'LUNAS';
    const nama     = p?.nama    || t.nama_pelanggan || '-';
    const rt       = p?.rt      || t.rt             || '-';
    const idMeter  = p?.qr_code || t.qr_code        || '-';
    const golongan = (p?.golongan || t.golongan || '').replace(/_/g, ' ') || '-';

    return (
        <div id="print-area" className="nota-wrap">

            {/* ── HEADER ── */}
            <div className="n-center n-mb">
                {s?.logo_image && (
                    <img src={s.logo_image} alt="logo" className="n-logo" />
                )}
                <div className="n-bold n-md">{s?.nama_spab || 'SPAB KRL Ragam Berseri'}</div>
                {s?.no_telepon_admin && (
                    <div className="n-muted n-sm">Telp: {s.no_telepon_admin}</div>
                )}
            </div>

            <Sep double />

            {/* ── JUDUL ── */}
            <div className="n-center n-mb">
                <div className="n-bold n-md">TAGIHAN AIR</div>
                <div className="n-sm">{fPeriode(t.periode_bulan)}</div>
            </div>

            <Sep />

            {/* ── STATUS ── */}
            <div className={`n-center n-bold n-sm n-status n-mb ${isLunas ? 'n-lunas' : 'n-belum'}`}>
                {isLunas ? '[ LUNAS ]' : '[ BELUM DIBAYAR ]'}
            </div>

            <Sep />

            {/* ── NO TAGIHAN ── */}
            <div className="n-mb-sm">
                <div className="n-muted n-sm">No. Tagihan</div>
                <div className="n-bold n-mono">{t.nomor_tagihan || '-'}</div>
            </div>

            <Sep />

            {/* ── INFO PELANGGAN ── */}
            <div className="n-mb-sm">
                <Row k="Nama"       v={nama}      bold />
                <Row k="RT"         v={rt} />
                <Row k="ID Meteran" v={idMeter}   mono />
                <Row k="Golongan"   v={golongan} />
            </div>

            <Sep />

            {/* ── PEMAKAIAN ── */}
            <div className="n-mb-sm">
                <Row k="Meter Awal" v={fM3(t.angka_meter_awal ?? 0)} />
                <Row k="Meter Akhir" v={fM3(t.angka_meter_akhir ?? 0)} />
                <Row k="Pemakaian"  v={fM3(t.pemakaian_m3    ?? 0)} bold />
            </div>

            <Sep />

            {/* ── RINCIAN BIAYA ── */}
            <div className="n-mb-sm">
                <Row k="Tarif/m³"       v={fRp(t.tarif_per_m3)} muted />
                <Row k="Biaya Air"      v={fRp(t.biaya_air)} />
                <Row k="Biaya Abodemen" v={fRp(t.biaya_admin)} />
            </div>

            <Sep double />

            {/* ── TOTAL ── */}
            <div className="n-mb-sm">
                <Row k="TOTAL" v={fRp(t.total_tagihan)} bold />
                {!isLunas && (
                    <Row k="Sisa Tagihan" v={fRp(t.sisa_tagihan ?? t.total_tagihan)} muted />
                )}
            </div>

            {/* ── INFO LUNAS ── */}
            {isLunas && t.tanggal_bayar && (
                <>
                    <Sep />
                    <div className="n-mb-sm">
                        <Row k="Dibayar" v={formatDate(t.tanggal_bayar)} />
                        <Row k="Metode"  v={t.metode_bayar || '-'} />
                    </div>
                </>
            )}

            <Sep />

            {/* ── INFO PEMBAYARAN + QRIS (belum lunas) ── */}
            {!isLunas && (
                <div className="n-mb-sm n-sm">
                    {s?.nama_bank && s?.no_rekening && (
                        <>
                            <div className="n-muted">Transfer ke:</div>
                            <div className="n-bold">{s.nama_bank} — {s.no_rekening}</div>
                            <div className="n-muted">a.n. {s.nama_spab || '-'}</div>
                        </>
                    )}
                    {s?.no_telepon_admin && (
                        <div>Info: WA {s.no_telepon_admin}</div>
                    )}

                    <div className="n-center n-mt n-mb-sm">
                        <div className="n-bold n-mb-sm">Bayar via QRIS:</div>
                        {s?.qris_image ? (
                            <img src={s.qris_image} alt="QRIS" className="n-qris" />
                        ) : (
                            <QRCodeSVG
                                value={t.nomor_tagihan || ''}
                                size={80}
                                style={{ display: 'block', margin: '0 auto' }}
                            />
                        )}
                    </div>
                    <Sep />
                </div>
            )}

            {/* ── QR METERAN ── */}
            <div className="n-center n-mb-sm">
                <QRCodeSVG
                    value={idMeter}
                    size={64}
                    style={{ display: 'block', margin: '0 auto' }}
                />
                <div className="n-xs n-mono n-muted">{idMeter}</div>
            </div>

            <Sep dashed />

            {/* ── FOOTER ── */}
            <div className="n-center n-xs n-muted">
                <div>Terimakasih atas</div>
                <div>kepercayaan anda</div>
                <div>menggunakan layanan</div>
                <div>{(s?.nama_spab || 'SPAB KRL Ragam Berseri').toUpperCase()}</div>
                <div className="n-mt-sm">Dicetak: {new Date().toLocaleString('id-ID')}</div>
            </div>

        </div>
    );
}

/* ── Sub-komponen ── */

function Sep({ dashed = false, double = false }) {
    if (double) return <div className="n-sep-double" />;
    if (dashed) return <div className="n-sep-dashed" />;
    return <div className="n-sep" />;
}

function Row({ k, v, bold, muted, mono }) {
    return (
        <div className="n-row">
            <span className="n-row-k n-muted">{k}</span>
            <span className={`n-row-v ${bold ? 'n-bold' : ''} ${mono ? 'n-mono' : ''} ${muted ? 'n-muted' : ''}`}>
                {v}
            </span>
        </div>
    );
}

function fRp(v) {
    const n = Number(v ?? 0);
    return 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function fPeriode(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const M = ['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember'];
    return M[d.getMonth()] + ' ' + d.getFullYear();
}

function fM3(v) {
    return Number(v ?? 0).toLocaleString('id-ID', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
    }) + ' m³';
}

/* ════════════════════════════════════════
   STYLES — 58mm thermal, screen & print
   ════════════════════════════════════════ */
export function NotaStyles() {
    return (
        <style>{`
            /* ── Wrapper ── */
            .nota-wrap {
                width: 220px;         /* ≈ 58mm pada layar 96dpi */
                max-width: 220px;
                margin: 0 auto;
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                line-height: 1.45;
                color: #1e293b;
                background: #fff;
                padding: 10px 12px;
                box-sizing: border-box;
            }
            @media screen {
                .nota-wrap {
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,.08);
                }
            }
            @media print {
                .no-print   { display: none !important; }
                html, body  { background: #fff !important; margin: 0; padding: 0; }
                body > *:not(#root) { display: none !important; }
                .nota-wrap  {
                    width: 58mm !important;
                    max-width: 58mm !important;
                    margin: 0 !important;
                    padding: 2mm 3mm !important;
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    font-size: 8pt !important;
                    line-height: 1.35 !important;
                    font-family: 'Courier New', Courier, monospace !important;
                    color: #000 !important;
                }
                .n-muted    { color: #000 !important; }
                .n-sep      { border-top: 1px solid #000 !important; margin: 3px 0 !important; }
                .n-sep-dashed { border-top: 1px dashed #000 !important; margin: 3px 0 !important; }
                .n-sep-double { border-top: 3px double #000 !important; margin: 3px 0 !important; }
                .n-lunas    { border: 1px dashed #000 !important; color: #000 !important; }
                .n-belum    { border: 1px dashed #000 !important; color: #000 !important; }
                .n-xs   { font-size: 7pt !important; }
                .n-sm   { font-size: 7.5pt !important; }
                .n-md   { font-size: 9pt !important; }
                img, svg    { display: block !important; }
                @page       { size: 58mm auto; margin: 0; }
            }

            /* ── Typography ── */
            .n-xs   { font-size: 9px; }
            .n-sm   { font-size: 10px; }
            .n-md   { font-size: 12px; }
            .n-bold { font-weight: 700; }
            .n-mono { font-family: 'Courier New', Courier, monospace; }
            .n-muted { color: #64748b; }

            /* ── Spacing ── */
            .n-mb     { margin-bottom: 5px; }
            .n-mb-sm  { margin-bottom: 3px; }
            .n-mt     { margin-top: 4px; }
            .n-mt-sm  { margin-top: 3px; }

            /* ── Alignment ── */
            .n-center { text-align: center; }

            /* ── Separators ── */
            .n-sep        { border-top: 1px solid #94a3b8; margin: 4px 0; }
            .n-sep-dashed { border-top: 1px dashed #94a3b8; margin: 4px 0; }
            .n-sep-double { border-top: 3px double #334155; margin: 4px 0; }

            /* ── Status ── */
            .n-status      { padding: 2px 4px; }
            .n-lunas       { border: 1px dashed #16a34a; color: #15803d; }
            .n-belum       { border: 1px dashed #dc2626; color: #dc2626; }

            /* ── Row (dua kolom) ── */
            .n-row    {
                display: flex;
                justify-content: space-between;
                gap: 4px;
                margin-bottom: 1px;
            }
            .n-row-k  { flex-shrink: 0; white-space: nowrap; }
            .n-row-v  { text-align: right; word-break: break-word; }

            /* ── Images ── */
            .n-logo { height: 32px; display: block; margin: 0 auto 4px; object-fit: contain; }
            .n-qris { width: 80px; height: 80px; display: block; margin: 0 auto; object-fit: contain; }
        `}</style>
    );
}
