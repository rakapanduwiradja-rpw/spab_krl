# SPAB KRL Ragam Berseri — PRD

## Original Problem Statement
Build a water usage recording & billing system for SPAB KRL Ragam Berseri
(residential water utility, ±248 customers across RT01/RT02/RT03). Originally
spec'd for React+Vite web + React Native mobile + Node/Postgres backend.

## User Choices (confirmed)
- Scope: **WebApp Dashboard Admin + mobile-friendly Petugas pages** (no native app)
- Tech: **React CRA + FastAPI + MongoDB** (Emergent-native stack)
- QR scan: **html5-qrcode camera-in-browser**
- WhatsApp: manual **wa.me** link (no paid API)
- QRIS: admin uploads static QRIS image in Pengaturan

## User Personas
- **Admin** — manages pelanggan, tarif, pengaturan, melihat tren, cetak nota. Uses desktop dashboard.
- **Petugas** — catat meter di lapangan, terima pembayaran. Uses mobile-web UI on smartphone.

## Core Requirements (Static)
- Multi-role auth (ADMIN / PETUGAS) with JWT
- Pelanggan CRUD with auto-generated QR stiker (MTR-YYYY-XXXX)
- Scan QR → lookup meter + tunggakan → catat angka
- Auto-hitung pemakaian, auto-generate tagihan with biaya admin + tarif/m³
- Deteksi anomali (> 2× rata-rata 3 bulan)
- Multi-metode bayar: QRIS / Tunai (kalkulator kembalian) / Transfer
- Bayar sebagian → status SEBAGIAN
- Nota tagihan printable (A5) dengan QR pembayaran
- Stiker QR printable 4-in-1 A4
- Dashboard KPI + progres per RT + aktivitas feed
- Tren pemakaian, pendapatan, distribusi golongan, anomali (charts)
- Kirim WA via wa.me link dengan template otomatis
- Kelola tarif + biaya admin via settings

## Implementation Status (as of 28 Feb 2026)

### ✅ Implemented — Feb 2026
- **Auth**: JWT Bearer (7-day), bcrypt hashing, ADMIN & PETUGAS roles, seeded accounts
- **Backend endpoints** (all /api prefix, 24/24 tests passing):
  - `/auth/login`, `/auth/me`, `/auth/logout`
  - `/pelanggan` CRUD, `/pelanggan/:id` detail+history
  - `/meteran/scan/:qr_code` with tunggakan summary
  - `/pencatatan` POST (auto-anomali detection + auto-tagihan), list with filters
  - `/tagihan` list filters, `/tagihan/:id`, `/tagihan/:id/bayar` (QRIS/TUNAI/TRANSFER)
  - `/dashboard/stats` KPI + per-RT + aktivitas feed
  - `/tren/pemakaian?bulan=N&rt=X` + `/tren/anomali`
  - `/tarif` list/create, `/petugas` list/create (admin-only)
  - `/pengaturan` GET/PUT (includes QRIS base64 upload)
- **Seed data**: 10 pelanggan across 3 RTs + 3 months pencatatan/tagihan + 1 anomali case
- **Frontend**:
  - Login page (split hero with DM Sans, dark slate #0F172A sidebar, primary blue #1A6BFF)
  - Admin Dashboard: 4 KPI cards, RT progress bars, dot-map meter status, activity feed, belum-bayar table with WA button
  - Pelanggan list + detail (with history line chart + QR sticker preview + cetak stiker)
  - Tambah Pelanggan form (admin) + multi-step form (petugas)
  - Pencatatan list with periode+RT filter + CSV export
  - Tagihan list with status/RT/periode filters + bayar dialog + WA batch
  - Tren page: 4 charts (line pemakaian, bar pendapatan terbit vs terkumpul, pie golongan, bar anomali) + tabel anomali
  - Cetak Nota: printable A5 nota with QRIS
  - Tarif management + Pengaturan (QRIS upload) + Petugas user mgmt
  - Petugas mobile: Beranda, Scan (camera + manual fallback), Catat (with foto + catatan + estimasi), Bayar (QRIS/Tunai/Transfer + success overlay), Tambah Pelanggan 3-step wizard, Riwayat (tabs), Profil

### 📋 Backlog (P1 — nice to have)
- Real-time activity via WebSocket
- Bulk import pelanggan via CSV
- Statement PDF download via html2pdf
- Admin dashboard dark-mode
- Email receipt alternative
- Advanced tiered tarif (progressive blocks)
- Per-pelanggan multi-line chart toggle (up to 5) on Tren page
- GPS location capture in Catat screen
- Push notifications for anomali alerts (Firebase) — spec mentioned FCM
- Database nightly backup cron

### 📋 Backlog (P2 — future)
- Installable PWA (offline pencatatan, sync later)
- Automated WA reminder (via paid Fonnte/Twilio — user opted out)
- Multi-SPAB / multi-tenant

## Known Limitations
- QR scan requires HTTPS + camera permission; manual fallback always available
- File uploads (foto meter, QRIS) stored as base64 in MongoDB — acceptable for scale (±248) but not scalable for media-heavy use
- Single flat tarif/m³ (no tiered/progressive yet)
- `_next_qr_code()` uses count+1 (not race-safe for concurrent creates — noted for P1 fix)
- CORS allow_origins='*' acceptable for MVP; tighten before production

## Credentials (Demo)
- admin / admin123
- petugas / petugas123

## Next Action Items
- Monitor usage & take feedback from real petugas
- Implement P1 items once core is validated
- Add object-storage integration for photos when media volume grows
