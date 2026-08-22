#!/usr/bin/env python3
"""
patch_api_calls.py
Jalankan dari folder spab_krl-main/frontend:
    python3 patch_api_calls.py

Script ini mengupdate semua pemanggilan API di frontend dari:
    api.get("/pelanggan")            -> api.get(ENDPOINTS.PELANGGAN_LIST)
    api.post("/pelanggan")           -> api.post(ENDPOINTS.PELANGGAN_CREATE)
    api.get(`/pelanggan/${id}`)      -> api.get(ENDPOINTS.PELANGGAN_DETAIL, {params:{id}})
    api.put(`/pelanggan/${id}`)      -> api.put(`${ENDPOINTS.PELANGGAN_UPDATE}?id=${id}`)
    dll.
"""

import re
import os
import sys

# Mapping pola lama -> baru
REPLACEMENTS = [
    # Auth
    (r'"/auth/login"',                  'ENDPOINTS.AUTH_LOGIN'),
    (r'"/auth/me"',                     'ENDPOINTS.AUTH_ME'),

    # Pelanggan list/create
    (r'"/pelanggan"(?=\s*[,\)])',       'ENDPOINTS.PELANGGAN_LIST'),
    (r"'/pelanggan'(?=\s*[,\)])",       'ENDPOINTS.PELANGGAN_LIST'),

    # Pelanggan detail/update (dengan template literal /pelanggan/${...})
    (r'`/pelanggan/\$\{([^}]+)\}`',    lambda m: f'ENDPOINTS.PELANGGAN_DETAIL, {{params:{{id:{m.group(1)}}}}}'),

    # Scan QR
    (r'`/meteran/scan/\$\{([^}]+)\}`', lambda m: f'ENDPOINTS.METERAN_SCAN, {{params:{{qr:{m.group(1)}}}}}'),

    # Pencatatan
    (r'"/pencatatan"(?=\s*[,\)])',      'ENDPOINTS.PENCATATAN_LIST'),
    (r"'/pencatatan'(?=\s*[,\)])",      'ENDPOINTS.PENCATATAN_LIST'),

    # Tagihan list
    (r'"/tagihan"(?=\s*[,\)])',         'ENDPOINTS.TAGIHAN_LIST'),
    (r"'/tagihan'(?=\s*[,\)])",         'ENDPOINTS.TAGIHAN_LIST'),

    # Tagihan detail
    (r'`/tagihan/\$\{([^}]+)\}`(?!\s*/bayar)', lambda m: f'ENDPOINTS.TAGIHAN_DETAIL, {{params:{{id:{m.group(1)}}}}}'),

    # Tagihan bayar
    (r'`/tagihan/\$\{([^}]+)\}/bayar`', lambda m: f'ENDPOINTS.TAGIHAN_BAYAR, {{params:{{id:{m.group(1)}}}}}'),

    # Dashboard
    (r'"/dashboard/stats"',             'ENDPOINTS.DASHBOARD_STATS'),
    (r"'/dashboard/stats'",             'ENDPOINTS.DASHBOARD_STATS'),

    # Tren
    (r'"/tren/pemakaian"',              'ENDPOINTS.TREN_PEMAKAIAN'),
    (r"'/tren/pemakaian'",              'ENDPOINTS.TREN_PEMAKAIAN'),
    (r'"/tren/anomali"',                'ENDPOINTS.TREN_ANOMALI'),
    (r"'/tren/anomali'",                'ENDPOINTS.TREN_ANOMALI'),

    # Tarif
    (r'"/tarif"(?=\s*[,\)])',           'ENDPOINTS.TARIF_LIST'),
    (r"'/tarif'(?=\s*[,\)])",           'ENDPOINTS.TARIF_LIST'),

    # Petugas
    (r'"/petugas"(?=\s*[,\)])',         'ENDPOINTS.PETUGAS_LIST'),
    (r"'/petugas'(?=\s*[,\)])",         'ENDPOINTS.PETUGAS_LIST'),

    # Pengaturan
    (r'"/pengaturan"(?=\s*[,\)])',      'ENDPOINTS.PENGATURAN_GET'),
    (r"'/pengaturan'(?=\s*[,\)])",      'ENDPOINTS.PENGATURAN_GET'),
]

IMPORT_LINE_OLD = 'import api from'
IMPORT_LINE_NEW = 'import api, { ENDPOINTS } from'

def patch_file(filepath: str) -> bool:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changed = False

    # Tambah ENDPOINTS ke import jika belum ada
    if IMPORT_LINE_OLD in content and 'ENDPOINTS' not in content:
        content = content.replace(IMPORT_LINE_OLD, IMPORT_LINE_NEW)
        changed = True

    # Apply semua replacements
    for pattern, replacement in REPLACEMENTS:
        if callable(replacement):
            new_content = re.sub(pattern, replacement, content)
        else:
            new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            content = new_content
            changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    src_dir = os.path.join(os.path.dirname(__file__), 'src')
    if not os.path.exists(src_dir):
        print(f"Error: folder src tidak ditemukan di {src_dir}")
        sys.exit(1)

    patched = []
    for root, dirs, files in os.walk(src_dir):
        # Skip node_modules
        dirs[:] = [d for d in dirs if d != 'node_modules']
        for fname in files:
            if fname.endswith(('.js', '.jsx')):
                fpath = os.path.join(root, fname)
                if patch_file(fpath):
                    patched.append(fpath.replace(src_dir, 'src'))

    if patched:
        print(f"\n✅ {len(patched)} file diupdate:")
        for f in patched:
            print(f"   {f}")
    else:
        print("\nTidak ada file yang perlu diupdate.")

    print("\nSelesai! Cek perubahan dengan: git diff src/")


if __name__ == "__main__":
    main()
