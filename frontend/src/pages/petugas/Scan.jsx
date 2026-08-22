import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowLeft, Keyboard, Camera, Loader2, CalendarCheck, CheckCircle2, QrCode } from "lucide-react";
import { toast } from "sonner";

async function safeStop(scanner, runningRef) {
    try {
        const st = scanner.getState ? scanner.getState() : null;
        const canStop =
            st === Html5QrcodeScannerState.SCANNING ||
            st === Html5QrcodeScannerState.PAUSED ||
            runningRef.current;
        if (canStop) await scanner.stop();
    } catch (_) {}
    runningRef.current = false;
}

// Generate daftar periode 12 bulan terakhir — dipanggil sekali di luar komponen
const PERIODE_OPTIONS = (() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const iso = `${y}-${m}-01T00:00:00+00:00`;
        const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        opts.push({ value: iso, label, isCurrent: i === 0 });
    }
    return opts;
})();

export default function Scan() {
    const nav = useNavigate();
    const [mode, setMode] = useState("camera");
    const [manual, setManual] = useState("");
    const [starting, setStarting] = useState(false);
    const [periode, setPeriode] = useState(PERIODE_OPTIONS[0].value);
    const [scannedQr, setScannedQr] = useState(null); // setelah scan → tampilkan konfirmasi
    const scannerRef = useRef(null);
    const runningRef = useRef(false);
    // Ref agar callback kamera selalu baca periode terbaru
    const periodeRef = useRef(periode);

    useEffect(() => {
        periodeRef.current = periode;
    }, [periode]);

    const startCamera = useCallback(() => {
        const id = "qr-scanner-region";
        const el = document.getElementById(id);
        if (!el) return;
        setStarting(true);
        const scanner = new Html5Qrcode(id, { verbose: false });
        scannerRef.current = scanner;
        let cancelled = false;
        scanner
            .start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                (decodedText) => {
                    if (cancelled) return;
                    cancelled = true;
                    safeStop(scanner, runningRef).finally(() => {
                        // Tampilkan panel konfirmasi sebelum lanjut
                        setScannedQr(decodedText);
                    });
                },
                () => {},
            )
            .then(() => {
                if (cancelled) { safeStop(scanner, runningRef); return; }
                runningRef.current = true;
                setStarting(false);
            })
            .catch(() => {
                setStarting(false);
                if (!cancelled) {
                    toast.error("Tidak dapat mengakses kamera. Gunakan input manual.");
                    setMode("manual");
                }
            });
        return () => {
            cancelled = true;
            safeStop(scanner, runningRef);
        };
    }, []);

    useEffect(() => {
        if (mode !== "camera" || scannedQr) return;
        const cleanup = startCamera();
        return () => { cleanup?.(); };
    }, [mode, scannedQr, startCamera]);

    const lanjutkan = () => {
        const qr = scannedQr || manual.trim();
        if (!qr) return;
        nav(`/petugas/catat/${qr}?periode=${encodeURIComponent(periodeRef.current)}`);
    };

    const ulangiScan = () => {
        setScannedQr(null);
    };

    const periodeLabel = PERIODE_OPTIONS.find((o) => o.value === periode)?.label || "";

    // ── Panel konfirmasi setelah scan berhasil ──
    if (scannedQr) {
        return (
            <div data-testid="scan-konfirmasi-page">
                <header className="px-5 py-4 bg-[hsl(var(--sidebar))] text-white flex items-center gap-3">
                    <button onClick={ulangiScan}><ArrowLeft className="w-5 h-5" /></button>
                    <div className="font-semibold">Konfirmasi Pencatatan</div>
                </header>
                <div className="p-5 space-y-4">
                    {/* QR berhasil dibaca */}
                    <Card className="p-4 border-emerald-200 bg-emerald-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs text-emerald-600 font-medium">QR berhasil dibaca</div>
                                <div className="font-mono font-semibold text-sm text-emerald-800 mt-0.5 break-all">{scannedQr}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Pilih / konfirmasi periode */}
                    <Card className="p-4 border-slate-200">
                        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-[hsl(var(--primary))]" />
                            Periode Pencatatan
                        </Label>
                        <Select value={periode} onValueChange={setPeriode}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PERIODE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}{o.isCurrent ? " (Bulan ini)" : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Data meter akan dicatat untuk periode{" "}
                            <span className="font-semibold text-slate-700">{periodeLabel}</span>.
                        </p>
                    </Card>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={ulangiScan}
                        >
                            <QrCode className="w-4 h-4 mr-1.5" /> Scan Ulang
                        </Button>
                        <Button
                            className="flex-1 bg-[hsl(var(--primary))]"
                            onClick={lanjutkan}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Lanjut Catat
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Halaman utama scan ──
    return (
        <div data-testid="scan-page">
            <header className="px-5 py-4 bg-[hsl(var(--sidebar))] text-white flex items-center gap-3">
                <button onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></button>
                <div className="font-semibold">Scan QR Meteran</div>
                <div className="ml-auto flex items-center gap-1 text-xs bg-white/20 rounded-full px-2.5 py-1">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    {periodeLabel}
                </div>
            </header>

            <div className="p-5 space-y-4">
                {/* Pilih Periode */}
                <Card className="p-4 border-slate-200">
                    <Label className="text-sm font-medium text-slate-700">Periode Pencatatan</Label>
                    <Select value={periode} onValueChange={setPeriode}>
                        <SelectTrigger className="mt-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PERIODE_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}{o.isCurrent ? " (Bulan ini)" : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 mt-1.5">
                        Periode dipilih:{" "}
                        <span className="font-semibold text-slate-600">{periodeLabel}</span>.
                        Setelah scan akan muncul konfirmasi sebelum mencatat.
                    </p>
                </Card>

                {mode === "camera" ? (
                    <Card className="border-slate-200 overflow-hidden relative spab-shadow">
                        <div id="qr-scanner-region" className="w-full" style={{ aspectRatio: "1/1", background: "#000" }} />
                        <div className="qr-overlay-frame"><span></span></div>
                        {starting && (
                            <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50 text-sm">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Menyiapkan kamera...
                            </div>
                        )}
                    </Card>
                ) : (
                    <Card className="p-5 border-slate-200" data-testid="manual-input-card">
                        <label className="text-sm font-medium">Kode QR Meteran</label>
                        <Input
                            value={manual}
                            onChange={(e) => setManual(e.target.value)}
                            placeholder="mis. MTR-2025-0042"
                            className="mt-2 font-mono"
                            data-testid="input-manual-qr"
                        />
                        <Button
                            className="mt-4 w-full bg-[hsl(var(--primary))]"
                            disabled={!manual}
                            onClick={() => nav(`/petugas/catat/${manual.trim()}?periode=${encodeURIComponent(periode)}`)}
                            data-testid="btn-manual-scan"
                        >
                            Lanjut
                        </Button>
                    </Card>
                )}

                <div className="flex gap-2">
                    <Button variant={mode === "camera" ? "default" : "outline"} className="flex-1" onClick={() => setMode("camera")}>
                        <Camera className="w-4 h-4 mr-1.5" /> Kamera
                    </Button>
                    <Button variant={mode === "manual" ? "default" : "outline"} className="flex-1" onClick={() => setMode("manual")}>
                        <Keyboard className="w-4 h-4 mr-1.5" /> Manual
                    </Button>
                </div>
            </div>
        </div>
    );
}
