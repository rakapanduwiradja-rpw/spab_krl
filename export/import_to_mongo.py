"""
Import file "firestore_export.json" (hasil export_firestore.py) ke MongoDB Atlas.
Jalankan ini SETELAH backend_mongo sudah di-deploy dan MONGODB_URI sudah ada.

Cara pakai:
    pip install pymongo
    python import_to_mongo.py

PENTING: taruh file firestore_export.json di folder yang sama sebelum jalankan ini.
"""

import json
from urllib.parse import quote_plus
from pymongo import MongoClient

# --- ISI 3 BAGIAN INI SAJA, apa adanya, TANPA perlu encode manual ---
# Ambil dari Atlas > Connect > Drivers > Python, contoh:
#   mongodb+srv://USERNAME:PASSWORD@HOST/?retryWrites=true&w=majority
# Pecah jadi 3 bagian di bawah ini:
MONGO_USERNAME = "spab_krl_ragam"        # contoh: rakapanduwiradja_db_user
MONGO_PASSWORD = "4fEsSyOT139WDWNy"        # password asli, walau ada simbol @ # % dll TIDAK APA-APA, biarkan apa adanya
MONGO_HOST = "spabragam.i92o4uj.mongodb.net"                # contoh: spabragam.i92o4uj.mongodb.net (TANPA "mongodb+srv://" dan TANPA username/password)

MONGODB_DB_NAME = "spab_krl_ragam"


def build_uri():
    user = quote_plus(MONGO_USERNAME)
    pwd = quote_plus(MONGO_PASSWORD)
    return f"mongodb+srv://{user}:{pwd}@{MONGO_HOST}/?retryWrites=true&w=majority"


def main():
    with open("firestore_export.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    client = MongoClient(build_uri())
    db = client[MONGODB_DB_NAME]

    total = 0
    for nama_koleksi, dokumen_list in data.items():
        if not dokumen_list:
            print(f"Koleksi '{nama_koleksi}' kosong, dilewati.")
            continue

        coll = db[nama_koleksi]
        dimasukkan = 0
        for doc in dokumen_list:
            doc = dict(doc)  # copy supaya tidak mengubah data asli
            # "_id" dari export ini isinya ID dokumen Firestore (string) -> pertahankan sebagai _id Mongo
            doc_id = doc["_id"]
            doc["_id"] = doc_id
            coll.replace_one({"_id": doc_id}, doc, upsert=True)
            dimasukkan += 1

        print(f"Koleksi '{nama_koleksi}': {dimasukkan} dokumen dimasukkan/diperbarui")
        total += dimasukkan

    print(f"\nSELESAI. Total {total} dokumen berhasil dipindah ke MongoDB Atlas.")


if __name__ == "__main__":
    if MONGO_USERNAME.startswith("GANTI_") or MONGO_PASSWORD.startswith("GANTI_") or MONGO_HOST.startswith("GANTI_"):
        raise SystemExit("Isi dulu MONGO_USERNAME, MONGO_PASSWORD, dan MONGO_HOST di bagian atas file ini.")
    main()
