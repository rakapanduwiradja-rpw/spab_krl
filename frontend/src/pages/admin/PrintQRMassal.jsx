import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Printer, CheckSquare, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrintQRMassal() {
    const nav = useNavigate();
    const [pelanggan, setPelanggan] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [rt, setRt] = useState("ALL");
    const canvasRefs = useRef({});

    useEffect(() => {
        setLoading(true);
        const params = rt !== "ALL" ? { rt } : {};
        api.get("/pelanggan_list", { params })
            .then(r => {
                const list = (r.data.data || []).filter(p => p.status_aktif !== false);
                setPelanggan(list);
                setSelected(new Set(list.map(p => p.id)));
            })
            .finally(() => setLoading(false));
    }, [rt]);

    const toggleAll = () =>
        setSelected(selected.size === pelanggan.length
            ? new Set()
            : new Set(pelanggan.map(p => p.id)));

    const toggle = (id) => {
        const s = new Set(selected);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelected(s);
    };

    const handlePrint = () => {
        const selectedList = pelanggan.filter(p => selected.has(p.id));

        // Kumpulkan semua canvas QR yang sudah dirender
        const canvasData = {};
        for (const p of selectedList) {
            const canvas = canvasRefs.current[p.id];
            if (canvas) {
                canvasData[p.id] = canvas.toDataURL("image/png");
            }
        }

        // Buat window print baru
        const printWindow = window.open("", "_blank", "width=800,height=600");
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Print QR Massal - SPAB KRL</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: white; }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5mm;
    padding: 8mm;
  }
  .stiker {
    border: 1px dashed #aaa;
    border-radius: 4mm;
    padding: 4mm;
    text-align: center;
    page-break-inside: avoid;
  }
  .no { font-size: 16pt; font-weight: bold; margin-bottom: 2mm; }
  .qr-img { width: 110px; height: 110px; }
  .nama { font-size: 9pt; font-weight: bold; margin-top: 2mm; }
  .kode { font-size: 6.5pt; font-family: monospace; color: #555; }
  .org { font-size: 5.5pt; color: #999; margin-top: 1mm; }
  @page { size: A4; margin: 5mm; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="grid">
  ${selectedList.map(p => `
    <div class="stiker">
      <div class="no">${p.qr_code?.split("-").pop() || ""}</div>
      <img class="qr-img" src="${canvasData[p.id] || ""}" />
      <div class="nama">${p.nama}</div>
      <div class="kode">${p.qr_code}</div>
      <div class="org">SPAB KRL Ragam Berseri &middot; ${p.rt}</div>
    </div>
  `).join("")}
</div>
<script>window.onload = function() { window.print(); window.close(); }</script>
</body>
</html>`);
        printWindow.document.close();
    };

    const selectedList = pelanggan.filter(p => selected.has(p.id));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => nav(-1)}
                        className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <h1 className="text-xl font-semibold">Print QR Massal</h1>
                </div>
                <div className="flex items-center gap-3">
                    <select value={rt} onChange={e => setRt(e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1.5">
                        <option value="ALL">Semua RT</option>
                        <option value="RT01">RT01</option>
                        <option value="RT02">RT02</option>
                        <option value="RT03">RT03</option>
                    </select>
                    <button onClick={toggleAll}
                        className="text-sm flex items-center gap-1.5 text-slate-600 border rounded-lg px-3 py-1.5">
                        {selected.size === pelanggan.length
                            ? <CheckSquare className="w-4 h-4 text-blue-600" />
                            : <Square className="w-4 h-4" />}
                        {selected.size}/{pelanggan.length}
                    </button>
                    <Button onClick={handlePrint} disabled={selected.size === 0}
                        className="bg-[hsl(var(--primary))]">
                        <Printer className="w-4 h-4 mr-1.5" />
                        Cetak {selected.size} Stiker
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-slate-500 text-sm">Memuat...</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {pelanggan.map(p => (
                        <div key={p.id} onClick={() => toggle(p.id)}
                            className={`border-2 rounded-xl p-3 cursor-pointer text-center transition-all select-none ${
                                selected.has(p.id)
                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                    : "border-slate-200 bg-white opacity-40"
                            }`}>
                            <div className="text-xs font-bold text-slate-500 mb-1">
                                {p.qr_code?.split("-").pop()}
                            </div>
                            {/* QRCodeCanvas - render ke canvas, bisa toDataURL() */}
                            <QRCodeCanvas
                                value={p.qr_code}
                                size={100}
                                ref={el => { if (el) canvasRefs.current[p.id] = el; }}
                                className="mx-auto"
                            />
                            <div className="text-xs font-semibold mt-1.5 truncate">{p.nama}</div>
                            <div className="text-xs text-slate-400">{p.rt}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
