import { useState } from 'react';
import { Bluetooth, BluetoothConnected, BluetoothOff, Printer, Trash2, RefreshCw, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useBluetoothPrinter } from '../lib/BluetoothPrinterContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

/**
 * Panel pengaturan Bluetooth Printer — bisa dipakai di Pengaturan admin & Profil petugas
 * Props:
 *   compact?: boolean — tampilan ringkas (untuk mobile petugas)
 */
export default function BluetoothPrinterPanel({ compact = false }) {
    const { printerInfo, status, errorMsg, supported, pair, forget, isPairing } = useBluetoothPrinter();
    const [testMsg, setTestMsg] = useState('');

    const handlePair = async () => {
        setTestMsg('');
        const ok = await pair();
        if (ok) setTestMsg('Printer berhasil dipasangkan!');
    };

    const StatusBadge = () => {
        if (!supported) return <Badge className="bg-red-100 text-red-700 border-red-200">Tidak Didukung</Badge>;
        if (isPairing) return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Loader2 className="w-3 h-3 mr-1 animate-spin inline" />Mencari...</Badge>;
        if (printerInfo) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Terpasang</Badge>;
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Belum Dipasang</Badge>;
    };

    if (!supported) {
        return (
            <div className={compact ? 'p-4' : ''}>
                <Card className="p-4 border-amber-200 bg-amber-50">
                    <div className="flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="font-semibold text-amber-800 text-sm">Web Bluetooth Tidak Didukung</div>
                            <div className="text-xs text-amber-700 mt-1 space-y-1">
                                <p>Browser Anda tidak mendukung Web Bluetooth API yang diperlukan untuk koneksi printer.</p>
                                <p className="font-medium">Gunakan salah satu berikut:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>Google Chrome (desktop/Android)</li>
                                    <li>Microsoft Edge (desktop/Android)</li>
                                    <li>Samsung Internet (Android, aktifkan flag)</li>
                                </ul>
                                <p className="text-amber-600">iOS/Safari tidak mendukung Web Bluetooth.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (compact) {
        // Tampilan ringkas untuk petugas
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {printerInfo ? (
                            <BluetoothConnected className="w-5 h-5 text-emerald-600" />
                        ) : (
                            <Bluetooth className="w-5 h-5 text-slate-400" />
                        )}
                        <div>
                            <div className="text-sm font-semibold">
                                {printerInfo ? printerInfo.name : 'Printer Bluetooth'}
                            </div>
                            <div className="text-xs text-slate-500">
                                {printerInfo ? 'Printer thermal terpasang' : 'Belum ada printer'}
                            </div>
                        </div>
                    </div>
                    <StatusBadge />
                </div>

                {errorMsg && (
                    <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {errorMsg}
                    </div>
                )}
                {testMsg && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {testMsg}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={handlePair}
                        disabled={isPairing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isPairing ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Mencari...</>
                        ) : printerInfo ? (
                            <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Ganti Printer</>
                        ) : (
                            <><Bluetooth className="w-3.5 h-3.5 mr-1.5" />Pasang Printer</>
                        )}
                    </Button>
                    {printerInfo && (
                        <Button size="sm" variant="outline" onClick={forget} className="text-red-600 border-red-200 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>

                <div className="text-xs text-slate-400 flex items-start gap-1.5">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>Setelah print, printer akan disconnect otomatis dan reconnect saat print berikutnya.</span>
                </div>
            </div>
        );
    }

    // Tampilan lengkap untuk admin
    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        {printerInfo ? (
                            <BluetoothConnected className="w-5 h-5 text-blue-600" />
                        ) : (
                            <Bluetooth className="w-5 h-5 text-slate-400" />
                        )}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-800">
                            {printerInfo ? printerInfo.name : 'Tidak ada printer'}
                        </div>
                        <div className="text-xs text-slate-500">
                            {printerInfo
                                ? `Dipasang ${printerInfo.savedAt ? new Date(printerInfo.savedAt).toLocaleDateString('id-ID') : ''}`
                                : 'Printer thermal Bluetooth belum dipasang'}
                        </div>
                    </div>
                </div>
                <StatusBadge />
            </div>

            {errorMsg && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                </div>
            )}
            {testMsg && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{testMsg}</span>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={handlePair}
                    disabled={isPairing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isPairing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mencari Printer...</>
                    ) : printerInfo ? (
                        <><RefreshCw className="w-4 h-4 mr-2" />Ganti Printer</>
                    ) : (
                        <><Bluetooth className="w-4 h-4 mr-2" />Pasang Printer Bluetooth</>
                    )}
                </Button>
                {printerInfo && (
                    <Button variant="outline" onClick={forget} className="text-red-600 border-red-200 hover:bg-red-50 gap-2">
                        <Trash2 className="w-4 h-4" /> Hapus Printer
                    </Button>
                )}
            </div>

            <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 space-y-1.5">
                        <p className="font-medium text-slate-700">Cara menggunakan printer Bluetooth:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Nyalakan printer thermal Bluetooth dan pastikan dalam mode pairing</li>
                            <li>Klik <strong>"Pasang Printer Bluetooth"</strong> — browser akan menampilkan daftar perangkat BLE</li>
                            <li>Pilih printer Anda dari daftar dan klik <strong>"Pair"</strong></li>
                            <li>Setelah terpasang, tombol <strong>"Cetak via Bluetooth"</strong> aktif di halaman nota</li>
                        </ol>
                        <p className="text-slate-500">Kertas 58mm. Didukung: Chrome & Edge (desktop/Android).</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
