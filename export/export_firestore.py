"""
Export SEMUA data dari Firestore ke satu file JSON.
Jalankan ini di KOMPUTER LOKAL kamu (bukan di Render), karena butuh
serviceAccountKey.json yang sama dari waktu setup backend_render kemarin.

Cara pakai:
    pip install firebase-admin
    python export_firestore.py

Hasil: file "firestore_export.json" di folder yang sama, isinya semua
koleksi (users, pelanggan, pencatatan, tagihan, tarif, pengaturan).
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_PATH = "serviceAccountKey.json"  # ganti kalau nama filenya beda

# Semua koleksi yang dipakai aplikasi SPAB KRL
COLLECTIONS = ["users", "pelanggan", "pencatatan", "tagihan", "tarif", "pengaturan"]


def to_json_safe(value):
    """Ubah tipe data Firestore (Timestamp, dsb) jadi format yang bisa disimpan JSON."""
    if hasattr(value, "isoformat"):  # datetime / Firestore Timestamp
        return value.isoformat()
    if isinstance(value, dict):
        return {k: to_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_json_safe(v) for v in value]
    return value


def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    hasil = {}
    total_dokumen = 0

    for nama_koleksi in COLLECTIONS:
        print(f"Mengambil koleksi '{nama_koleksi}'...")
        docs = db.collection(nama_koleksi).stream()
        dokumen_list = []
        for doc in docs:
            data = doc.to_dict()
            data = to_json_safe(data)
            data["_id"] = doc.id  # simpan ID dokumen aslinya
            dokumen_list.append(data)
        hasil[nama_koleksi] = dokumen_list
        total_dokumen += len(dokumen_list)
        print(f"  -> {len(dokumen_list)} dokumen ditemukan")

    with open("firestore_export.json", "w", encoding="utf-8") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=2)

    print(f"\nSELESAI. Total {total_dokumen} dokumen dari {len(COLLECTIONS)} koleksi")
    print("Tersimpan di: firestore_export.json")


if __name__ == "__main__":
    main()
