import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Keyboard, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Scan() {
    const nav = useNavigate();
    const [mode, setMode] = useState("camera"); // camera | manual
    const [manual, setManual] = useState("");
    const [starting, setStarting] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        if (mode !== "camera") return;
        let stopped = false;
        const id = "qr-scanner-region";
        const el = document.getElementById(id);
        if (!el) return;
        setStarting(true);
        const scanner = new Html5Qrcode(id, { verbose: false });
        scannerRef.current = scanner;
        scanner
            .start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                (decodedText) => {
                    if (stopped) return;
                    stopped = true;
                    scanner
                        .stop()
                        .catch(() => {})
                        .finally(() => nav(`/petugas/catat/${decodedText}`));
                },
                () => {},
            )
            .then(() => setStarting(false))
            .catch(() => {
                setStarting(false);
                toast.error("Tidak dapat mengakses kamera. Gunakan input manual.");
                setMode("manual");
            });
        return () => {
            stopped = true;
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [mode, nav]);

    return (
        <div data-testid="scan-page">
            <header className="px-5 py-4 bg-[hsl(var(--sidebar))] text-white flex items-center gap-3">
                <button onClick={() => nav(-1)} data-testid="btn-back-scan">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="font-semibold">Scan QR Meteran</div>
                    <div className="text-xs text-slate-300">
                        Arahkan kamera ke stiker QR
                    </div>
                </div>
            </header>

            <div className="p-5">
                {mode === "camera" ? (
                    <Card className="border-slate-200 overflow-hidden relative spab-shadow">
                        <div
                            id="qr-scanner-region"
                            className="w-full"
                            style={{ aspectRatio: "1/1", background: "#000" }}
                        />
                        <div className="qr-overlay-frame">
                            <span></span>
                        </div>
                        {starting && (
                            <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50 text-sm">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Menyiapkan kamera...
                            </div>
                        )}
                    </Card>
                ) : (
                    <Card className="p-5 border-slate-200" data-testid="manual-input-card">
                        <label className="text-sm font-medium">
                            Kode QR Meteran
                        </label>
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
                            onClick={() => nav(`/petugas/catat/${manual.trim()}`)}
                            data-testid="btn-manual-scan"
                        >
                            Lanjut
                        </Button>
                    </Card>
                )}

                <div className="flex gap-2 mt-4">
                    <Button
                        variant={mode === "camera" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setMode("camera")}
                    >
                        <Camera className="w-4 h-4 mr-1.5" /> Kamera
                    </Button>
                    <Button
                        variant={mode === "manual" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setMode("manual")}
                    >
                        <Keyboard className="w-4 h-4 mr-1.5" /> Manual
                    </Button>
                </div>
            </div>
        </div>
    );
}
