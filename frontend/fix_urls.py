"""
fix_urls.py — jalankan dari folder:
  D:\PROGRAM\SPAB\spab_krl-main\frontend

python fix_urls.py
"""
import os, re

# Mapping URL lama -> baru
REPLACEMENTS = [
    # GET
    (r'api\.get\("/pelanggan"\b', 'api.get("/pelanggan_list"'),
    (r'api\.get\("/tagihan"\b', 'api.get("/tagihan_list"'),
    (r'api\.get\("/pencatatan"\b', 'api.get("/pencatatan_list"'),
    (r'api\.get\("/tarif"\b', 'api.get("/tarif_list"'),
    (r'api\.get\("/petugas"\b', 'api.get("/petugas_list"'),
    (r'api\.get\("/pengaturan"\b', 'api.get("/pengaturan_get"'),
    (r'api\.get\("/dashboard/stats"\)', 'api.get("/dashboard_stats")'),
    (r'api\.get\("/tren/pemakaian"\)', 'api.get("/tren_pemakaian")'),
    (r'api\.get\("/tren/anomali"\)', 'api.get("/tren_anomali")'),
    (r'api\.get\(`/meteran/scan/\$\{([^}]+)\}`\)',
     lambda m: f'api.get("/meteran_scan", {{ params: {{ qr: {m.group(1)} }} }})'),
    (r'api\.get\(`/pelanggan/\$\{([^}]+)\}`\)',
     lambda m: f'api.get("/pelanggan_detail", {{ params: {{ id: {m.group(1)} }} }})'),
    (r'api\.get\(`/tagihan/\$\{([^}]+)\}`\)',
     lambda m: f'api.get("/tagihan_detail", {{ params: {{ id: {m.group(1)} }} }})'),

    # POST
    (r'api\.post\("/pelanggan"\b', 'api.post("/pelanggan_create"'),
    (r'api\.post\("/pencatatan"\b', 'api.post("/pencatatan_create"'),
    (r'api\.post\("/petugas"\b', 'api.post("/petugas_create"'),
    (r'api\.post\("/tarif"\b', 'api.post("/tarif_create"'),
    (r'api\.post\(`/tagihan/\$\{([^}]+)\}/bayar`',
     lambda m: f'api.post("/tagihan_bayar", null, {{ params: {{ id: {m.group(1)} }} }}'),

    # PUT
    (r'api\.put\("/pengaturan"\b', 'api.put("/pengaturan_update"'),
    (r'api\.put\(`/pelanggan/\$\{([^}]+)\}`',
     lambda m: f'api.put("/pelanggan_update", null, {{ params: {{ id: {m.group(1)} }} }}'),
]

src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
patched = []

for root, dirs, files in os.walk(src_dir):
    dirs[:] = [d for d in dirs if d != "node_modules"]
    for fname in files:
        if not fname.endswith((".js", ".jsx")):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        original = content
        for pattern, replacement in REPLACEMENTS:
            if callable(replacement):
                content = re.sub(pattern, replacement, content)
            else:
                content = re.sub(pattern, replacement, content)
        if content != original:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            patched.append(fpath.replace(src_dir, "src"))

if patched:
    print(f"\n✅ {len(patched)} file diupdate:")
    for f in patched:
        print(f"   {f}")
else:
    print("\nTidak ada file yang perlu diupdate.")
print("\nSelesai!")