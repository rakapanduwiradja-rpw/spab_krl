/**
 * Bluetooth Thermal Printer Utility (Web Bluetooth API)
 * ESC/POS — kertas 58mm
 *
 * FIXES v4:
 * - Chunk size 64 bytes (lebih aman untuk BLE MTU minimum)
 * - Delay 80ms antar chunk (cukup untuk printer buffer)
 * - Semua baris dijamin ≤ 32 karakter (tidak ada overflow)
 * - Tidak ada string overflow yang corrupt ESC/POS stream
 * - INIT hanya sekali di awal
 * - Duplikasi data dihilangkan
 * - Semua section nota lengkap: header, pelanggan, pemakaian, biaya, total, footer
 */

/* ── ESC/POS constants ── */
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

/* ── BLE chunk & delay ── */
const CHUNK   = 64;    // bytes per BLE write (aman untuk printer buffer kecil)
const DELAY   = 80;    // ms antar chunk (lebih aman untuk printer lambat)

/* ── Printer services (RPPO2N & kompatibel) ── */
const KNOWN_SERVICES = [
    { service: '0000ff00-0000-1000-8000-00805f9b34fb', characteristic: '0000ff02-0000-1000-8000-00805f9b34fb' },
    { service: '000018f0-0000-1000-8000-00805f9b34fb', characteristic: '00002af1-0000-1000-8000-00805f9b34fb' },
    { service: '0000ae30-0000-1000-8000-00805f9b34fb', characteristic: '0000ae01-0000-1000-8000-00805f9b34fb' },
    { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', characteristic: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
];

/* ─────────────────────────────────────────────
   ENCODE — hanya ASCII, semua non-ASCII → '?'
   ───────────────────────────────────────────── */
function encodeText(str) {
    const map = {
        'á':'a','â':'a','ä':'a','à':'a',
        'é':'e','ê':'e','ë':'e','è':'e',
        'í':'i','î':'i','ï':'i','ì':'i',
        'ó':'o','ô':'o','ö':'o','ò':'o',
        'ú':'u','û':'u','ü':'u','ù':'u',
        'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U',
        // superscript → angka biasa
        '²':'2','³':'3','¹':'1',
        // simbol
        '\u2019':"'",'\u201c':'"','\u201d':'"',
        '\u2022':'-','\u2013':'-','\u2014':'-',
    };
    const buf = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 128) {
            buf.push(c);
        } else {
            const mapped = map[str[i]];
            if (mapped) {
                for (const ch of mapped) buf.push(ch.charCodeAt(0));
            } else {
                buf.push(0x3f); // '?'
            }
        }
    }
    return new Uint8Array(buf);
}

/* ── Builder helpers ── */
const W = 32; // lebar 58mm thermal = 32 chars

function rawBytes(...bytes) {
    return new Uint8Array(bytes.flat());
}

/** Teks → bytes + LF. DIJAMIN tidak melebihi W chars. */
function line(text) {
    // Truncate ke W chars sebelum encode
    const safe = String(text ?? '').slice(0, W);
    return new Uint8Array([...encodeText(safe), LF]);
}

/** Baris kosong */
function blank() {
    return new Uint8Array([LF]);
}

/** Separator W chars */
function sep(char = '-') {
    return line(char.repeat(W));
}

/** Baris dua kolom rata kiri–kanan, dijamin ≤ W chars */
function row(left, right) {
    const l = String(left  ?? '');
    const r = String(right ?? '');
    // Pastikan total tidak melebihi W
    const maxL = Math.max(1, W - r.length - 1);
    const safeL = l.length > maxL ? l.slice(0, maxL) : l;
    const gap = W - safeL.length - r.length;
    const result = safeL + (gap > 0 ? ' '.repeat(gap) : ' ') + r;
    return line(result.slice(0, W));
}

/** Teks di-center — pakai ESC/POS ALIGN_CENTER, jangan tambah padding manual */
function centered(text) {
    return line(String(text ?? '').slice(0, W));
}

/** Concat semua Uint8Array */
function concat(arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out   = new Uint8Array(total);
    let   off   = 0;
    for (const a of arrays) { out.set(a, off); off += a.length; }
    return out;
}

/* ── Format helpers ── */
function fRp(v) {
    const n = Number(v ?? 0);
    // Format: Rp5.000 (tanpa spasi, pakai titik sebagai pemisah ribuan)
    return 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function fNum(v, dec = 0) {
    return Number(v ?? 0).toLocaleString('id-ID', {
        maximumFractionDigits: dec,
        minimumFractionDigits: 0,
    });
}

function fM3(v) {
    return fNum(v, 0) + ' m3';
}

function fPeriode(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    const M = ['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember'];
    return M[d.getMonth()] + ' ' + d.getFullYear();
}

function fDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    const M = ['Jan','Feb','Mar','Apr','Mei','Jun',
               'Jul','Ags','Sep','Okt','Nov','Des'];
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
}

/* ═══════════════════════════════════════════════
   BUILD NOTA BYTES
   Format identik dengan NotaTagihan.jsx (screen)
   Urutan: HEADER → sep= → JUDUL → sep- → STATUS → sep- →
           NO TAGIHAN → sep- → PELANGGAN → sep- →
           PEMAKAIAN → sep- → BIAYA → sep= →
           TOTAL → [sisa] → [lunas info] → sep- →
           [transfer+QRIS jika belum lunas] →
           FOOTER → feed → cut
   ═══════════════════════════════════════════════ */
export function buildNotaBytes(tagihan, pelanggan, pengaturan) {
    const t = tagihan    ?? {};
    const p = pelanggan  ?? {};
    const s = pengaturan ?? {};
    const isLunas = t.status_bayar === 'LUNAS';

    // Semua ESC/POS commands sebagai raw bytes (BUKAN melalui encodeText)
    const INIT          = rawBytes(ESC, 0x40);
    const BOLD_ON       = rawBytes(ESC, 0x45, 0x01);
    const BOLD_OFF      = rawBytes(ESC, 0x45, 0x00);
    const ALIGN_LEFT    = rawBytes(ESC, 0x61, 0x00);
    const ALIGN_CENTER  = rawBytes(ESC, 0x61, 0x01);
    const FEED          = rawBytes(ESC, 0x64, 0x04);
    const CUT           = rawBytes(GS,  0x56, 0x01);

    const parts = [];
    const push = (...items) => items.forEach(i => parts.push(i));

    /* ── INIT (sekali saja di awal) ── */
    push(INIT);

    /* ── HEADER ── */
    push(ALIGN_CENTER);
    push(BOLD_ON);
    push(centered(s.nama_spab || 'SPAB KRL Ragam Berseri'));
    push(BOLD_OFF);
    if (s.no_telepon_admin) {
        push(centered('Telp: ' + s.no_telepon_admin));
    }
    push(ALIGN_LEFT);
    push(sep('='));

    /* ── JUDUL ── */
    push(ALIGN_CENTER);
    push(BOLD_ON);
    push(centered('TAGIHAN AIR'));
    push(BOLD_OFF);
    push(centered(fPeriode(t.periode_bulan)));
    push(ALIGN_LEFT);
    push(sep('-'));

    /* ── STATUS ── */
    push(ALIGN_CENTER);
    push(BOLD_ON);
    push(centered(isLunas ? '[ LUNAS ]' : '[ BELUM DIBAYAR ]'));
    push(BOLD_OFF);
    push(ALIGN_LEFT);
    push(sep('-'));

    /* ── NO TAGIHAN ── */
    push(line('No. Tagihan'));
    push(BOLD_ON);
    push(line(t.nomor_tagihan || '-'));
    push(BOLD_OFF);
    push(sep('-'));

    /* ── INFO PELANGGAN ── */
    const nama     = String(p.nama    || t.nama_pelanggan || '-');
    const rt       = String(p.rt      || t.rt             || '-');
    const idMeter  = String(p.qr_code || t.qr_code        || '-');
    const golongan = String((p.golongan || t.golongan || '-')).replace(/_/g, ' ');

    push(row('Nama',       nama));
    push(row('RT',         rt));
    push(row('ID Meteran', idMeter));
    push(row('Golongan',   golongan));
    push(sep('-'));

    /* ── PEMAKAIAN ── */
    push(row('Meter Awal', fM3(t.angka_meter_awal ?? 0)));
    push(row('Meter Akhir', fM3(t.angka_meter_akhir ?? 0)));
    push(BOLD_ON);
    push(row('Pemakaian',  fM3(t.pemakaian_m3 ?? 0)));
    push(BOLD_OFF);
    push(sep('-'));

    /* ── RINCIAN BIAYA ── */
    push(row('Tarif/m3',       fRp(t.tarif_per_m3 ?? 0)));
    push(row('Biaya Air',      fRp(t.biaya_air    ?? 0)));
    push(row('Biaya Abodemen', fRp(t.biaya_admin  ?? 0)));
    push(sep('='));

    /* ── TOTAL ── */
    push(BOLD_ON);
    push(row('TOTAL', fRp(t.total_tagihan ?? 0)));
    push(BOLD_OFF);

    if (!isLunas) {
        push(row('Sisa Tagihan', fRp(t.sisa_tagihan ?? t.total_tagihan ?? 0)));
    }

    /* ── INFO LUNAS ── */
    if (isLunas && t.tanggal_bayar) {
        push(sep('-'));
        push(row('Dibayar', fDate(t.tanggal_bayar)));
        push(row('Metode',  t.metode_bayar || '-'));
    }

    push(sep('-'));

    /* ── INFO PEMBAYARAN (belum lunas) ── */
    if (!isLunas) {
        if (s.nama_bank && s.no_rekening) {
            push(line('Transfer ke:'));
            push(BOLD_ON);
            push(line(s.nama_bank + ' - ' + s.no_rekening));
            push(BOLD_OFF);
            push(line('a.n. ' + (s.nama_spab || '-')));
        }
        if (s.no_telepon_admin) {
            push(line('Info: WA ' + s.no_telepon_admin));
        }
        push(sep('-'));
        push(ALIGN_CENTER);
        push(BOLD_ON);
        push(line(' '));
        push(BOLD_OFF);
        push(ALIGN_LEFT);
        push(sep('-'));
    }

    /* ── FOOTER ── */
    push(ALIGN_CENTER);
    push(centered('Terimakasih atas'));
    push(centered('kepercayaan anda'));
    push(centered('menggunakan layanan'));
    push(centered((s.nama_spab || 'SPAB KRL Ragam Berseri').toUpperCase()));
    push(blank());
    push(centered('Dicetak: ' + new Date().toLocaleString('id-ID')));
    push(ALIGN_LEFT);

    /* ── Feed & cut ── */
    push(FEED);
    push(CUT);

    return concat(parts);
}

/* ═══════════════════════════════════════════
   GATT — cari characteristic yang bisa ditulis
   ═══════════════════════════════════════════ */
async function findWritableCharacteristic(server) {
    // Coba known services dulu (lebih cepat)
    for (const { service, characteristic } of KNOWN_SERVICES) {
        try {
            const svc  = await server.getPrimaryService(service);
            const char = await svc.getCharacteristic(characteristic);
            if (char.properties.write || char.properties.writeWithoutResponse) {
                return char;
            }
        } catch (_) { /* service tidak ada, lanjut */ }
    }

    // Fallback: scan semua service
    try {
        const services = await server.getPrimaryServices();
        for (const svc of services) {
            try {
                const chars = await svc.getCharacteristics();
                for (const char of chars) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        return char;
                    }
                }
            } catch (_) {}
        }
    } catch (_) {}

    throw new Error('Tidak menemukan karakteristik printer yang kompatibel. Pastikan printer menyala dan dalam mode BLE.');
}

/* ═══════════════════════════════════════════
   SEND — kirim bytes dalam chunks kecil
   Chunk 64 bytes, delay 80ms antar chunk
   Aman untuk printer BLE MTU default (23-128 bytes)
   ═══════════════════════════════════════════ */
async function sendBytes(characteristic, data) {
    const useWriteWithoutResponse = characteristic.properties.writeWithoutResponse;

    for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        if (useWriteWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
        } else {
            await characteristic.writeValue(chunk);
        }
        // Delay agar printer sempat memproses setiap chunk
        await new Promise(r => setTimeout(r, DELAY));
    }
    // Delay tambahan di akhir agar printer flush buffer sebelum cut
    await new Promise(r => setTimeout(r, 200));
}

/* ═══════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════ */

export function isBluetoothSupported() {
    return typeof navigator !== 'undefined' && navigator.bluetooth !== undefined;
}

export async function pairPrinter() {
    if (!isBluetoothSupported()) {
        throw new Error('Web Bluetooth tidak didukung. Gunakan Chrome atau Edge di Android/desktop.');
    }
    const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000ae30-0000-1000-8000-00805f9b34fb',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
    });
    return { id: device.id, name: device.name || 'Printer Thermal', device };
}

export async function printBytes(device, bytes) {
    let server;
    try {
        server = await device.gatt.connect();
        const char = await findWritableCharacteristic(server);
        await sendBytes(char, bytes);
    } finally {
        // Selalu disconnect setelah selesai
        try {
            if (server?.connected) server.disconnect();
        } catch (_) {}
    }
}

/* ── Local storage helpers ── */
const STORAGE_KEY = 'spab_bt_printer';

export function getSavedPrinter() {
    try {
        const r = localStorage.getItem(STORAGE_KEY);
        return r ? JSON.parse(r) : null;
    } catch {
        return null;
    }
}

export function savePrinterInfo(info) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            name:    info.name,
            id:      info.id,
            savedAt: new Date().toISOString(),
        }));
    } catch (_) {}
}

export function removeSavedPrinter() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
}
