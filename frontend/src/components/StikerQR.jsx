import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";

export function StikerSVG({ p }) {
    return (
        <div
            style={{
                width: "5cm",
                height: "6cm",
                padding: "4mm",
                border: "1px dashed #cbd5e1",
                borderRadius: "6px",
                textAlign: "center",
                fontFamily: "DM Sans, sans-serif",
                display: "inline-flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                background: "#fff",
            }}
        >
            <div
                style={{
                    fontSize: "8px",
                    fontWeight: 700,
                    color: "#1A6BFF",
                    letterSpacing: "0.5px",
                }}
            >
                💧 SPAB KRL RAGAM BERSERI
            </div>
            <div style={{ margin: "auto" }}>
                <QRCodeSVG value={p.qr_code} size={110} />
            </div>
            <div>
                <div style={{ fontWeight: 700, fontSize: "11px" }}>
                    {p.nama}
                </div>
                <div style={{ fontSize: "9px", color: "#475569" }}>
                    {p.rt} · {p.qr_code}
                </div>
                <div
                    style={{
                        fontSize: "8px",
                        fontFamily: "monospace",
                        color: "#94a3b8",
                    }}
                >
                    {p.no_seri_meter}
                </div>
            </div>
        </div>
    );
}

export function printStiker(pelangganList) {
    const html = pelangganList
        .map((p) => renderToStaticMarkup(<StikerSVG p={p} />))
        .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Stiker QR</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: 'DM Sans', sans-serif; margin: 0; padding: 10mm; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  </style></head><body><div class="grid">${html}</div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
    w.document.close();
}
