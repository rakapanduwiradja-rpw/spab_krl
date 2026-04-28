export function formatRupiah(n) {
    const num = Number(n || 0);
    return "Rp " + num.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export function formatNumber(n, digits = 2) {
    const num = Number(n || 0);
    return num.toLocaleString("id-ID", {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
    });
}

const MONTHS_ID = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
];

export function formatPeriode(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function waLink(phone, message) {
    let p = String(phone || "").replace(/[^0-9]/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    if (!p.startsWith("62")) p = "62" + p;
    return `https://wa.me/${p}?text=${encodeURIComponent(message || "")}`;
}
