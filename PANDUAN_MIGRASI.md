# Panduan Migrasi SPAB KRL ke Firebase

## Gambaran Arsitektur Baru

```
Frontend React (CRA)     →  Firebase Hosting (static)
Backend FastAPI Python   →  Firebase Cloud Functions (Python)
MongoDB (motor)          →  Firestore
Auth JWT custom          →  Firebase Auth + Custom Token
```

---

## Prasyarat

- Node.js 18+ sudah terinstall
- Python 3.11 sudah terinstall  
- Sudah punya akun Firebase dan project Firebase

---

## LANGKAH 1 — Siapkan Folder Project

Struktur folder akhir yang kita tuju:

```
spab_krl-main/
├── firebase.json           ← BARU (dari folder ini)
├── firestore.rules         ← BARU
├── firestore.indexes.json  ← BARU
├── functions/              ← BARU (backend baru)
│   ├── main.py
│   └── requirements.txt
└── frontend/               ← EXISTING (sedikit perubahan)
    ├── src/
    │   └── lib/
    │       ├── api.js      ← GANTI
    │       └── auth.js     ← GANTI
    └── .env.local          ← BUAT BARU
```

---

## LANGKAH 2 — Install Firebase CLI & Login

```bash
npm install -g firebase-tools
firebase login
```

---

## LANGKAH 3 — Salin File Baru ke Project

```bash
# Dari folder patch ini, salin ke root project
cp firebase.json          ../spab_krl-main/
cp firestore.rules        ../spab_krl-main/
cp firestore.indexes.json ../spab_krl-main/

# Buat folder functions dan salin backend baru
mkdir -p ../spab_krl-main/functions
cp functions/main.py         ../spab_krl-main/functions/
cp functions/requirements.txt ../spab_krl-main/functions/

# Salin file frontend baru
cp frontend_patch/api.js  ../spab_krl-main/frontend/src/lib/api.js
cp frontend_patch/auth.js ../spab_krl-main/frontend/src/lib/auth.js
```

---

## LANGKAH 4 — Enable Firebase Authentication

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project Anda
3. Klik **Authentication** → **Get started**
4. Tab **Sign-in method** → Enable **Email/Password**
5. (Jangan tutup tab ini dulu)

---

## LANGKAH 5 — Buat File .env.local

```bash
cd spab_krl-main/frontend
cp .env.local.template .env.local   # atau buat manual
```

Isi `.env.local` dengan data dari Firebase Console:

1. Buka Firebase Console → **Project Settings** (ikon gear)
2. Scroll ke **Your apps** → klik **Web app** (atau tambah web app baru)
3. Copy nilai-nilai berikut:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=nama-project-anda.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=nama-project-anda
REACT_APP_FIREBASE_STORAGE_BUCKET=nama-project-anda.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123

REACT_APP_FUNCTIONS_BASE_URL=https://asia-southeast1-nama-project-anda.cloudfunctions.net
```

---

## LANGKAH 6 — Ganti Project ID di firebase.json

Edit `spab_krl-main/firebase.json` — tidak perlu ubah apa-apa, sudah otomatis.

Tapi pastikan `.firebaserc` berisi project ID yang benar:

```bash
cd spab_krl-main
firebase use --add
# Pilih project Firebase Anda dari daftar
```

---

## LANGKAH 7 — Install Dependencies Firebase di Frontend

```bash
cd spab_krl-main/frontend
npm install firebase
```

---

## LANGKAH 8 — Update API Calls di Frontend (Otomatis)

Jalankan script patch untuk update semua pemanggilan API:

```bash
cd spab_krl-main/frontend
python3 ../frontend_patch/patch_api_calls.py
```

Script ini mengubah semua `api.get("/pelanggan")` menjadi `api.get(ENDPOINTS.PELANGGAN_LIST)`, dll.

Setelah itu, cek perubahan:

```bash
git diff src/
```

---

## LANGKAH 9 — Set Environment Variable Cloud Functions

```bash
cd spab_krl-main
firebase functions:secrets:set SEED_SECRET
# Ketik secret key buatan sendiri, misal: spab2024rahasia
```

---

## LANGKAH 10 — Deploy ke Firebase

```bash
cd spab_krl-main

# Build frontend
cd frontend && npm run build && cd ..

# Deploy semuanya sekaligus
firebase deploy

# Atau deploy bertahap (disarankan pertama kali):
firebase deploy --only functions    # Deploy backend dulu
firebase deploy --only firestore    # Deploy rules & indexes
firebase deploy --only hosting      # Deploy frontend
```

---

## LANGKAH 11 — Inisialisasi Data Awal (Seed)

Setelah deploy, jalankan seed **sekali saja** via browser:

```
https://asia-southeast1-YOUR_PROJECT_ID.cloudfunctions.net/seed_init?secret=SECRET_YANG_ANDA_SET
```

Ini akan membuat:
- User admin (username: `admin`, password: `admin123`)
- User petugas (username: `petugas`, password: `petugas123`)
- Tarif air default: Rp 4.000/m³
- Pengaturan SPAB default

**Setelah seed berhasil, ganti password dari menu Pengaturan!**

---

## LANGKAH 12 — Cek Web Berjalan

Buka URL hosting:
```
https://YOUR_PROJECT_ID.web.app
```

Login dengan `admin` / `admin123`.

---

## Troubleshooting Umum

**Error: CORS** saat frontend memanggil Functions
→ Semua functions sudah ada CORS headers. Pastikan `REACT_APP_FUNCTIONS_BASE_URL` di `.env.local` sudah benar dan di-rebuild.

**Error: 401 Tidak terotentikasi**  
→ Pastikan Firebase Auth sudah di-enable di console, dan `REACT_APP_FIREBASE_API_KEY` sudah benar.

**Functions timeout**  
→ Normal untuk cold start pertama (~3-5 detik). Setelah itu cepat.

**Build error: firebase is not defined**  
→ Jalankan `npm install firebase` di folder frontend.

---

## Biaya Firebase (Estimasi untuk SPAB kecil)

| Layanan | Free Tier (Spark) | Estimasi Penggunaan |
|---|---|---|
| Hosting | 10 GB/bulan | ✅ Cukup |
| Cloud Functions | 2 juta invokasi/bulan | ✅ Cukup |
| Firestore | 50K read, 20K write/hari | ✅ Cukup |
| Firebase Auth | Unlimited | ✅ Gratis |

**Total: Rp 0/bulan** untuk skala RT/RW kecil.

> Catatan: Cloud Functions Python memerlukan **Blaze Plan** (pay-as-you-go),  
> tapi dengan usage kecil biaya tetap Rp 0. Perlu tambahkan kartu kredit ke akun Firebase.

---

## Upgrade Password Setelah Deploy

Login sebagai admin, lalu buka menu **Pengaturan** → ubah password petugas dan admin dari default.
