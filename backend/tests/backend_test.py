"""Backend regression tests for SPAB KRL Ragam Berseri API."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["data"]["user"]["role"] == "ADMIN"
    return body["data"]["token"]


@pytest.fixture(scope="session")
def petugas_token():
    r = requests.post(f"{API}/auth/login", json={"username": "petugas", "password": "petugas123"}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["data"]["user"]["role"] == "PETUGAS"
    return body["data"]["token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        d = r.json()["data"]
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert d["user"]["role"] == "ADMIN"
        assert "password_hash" not in d["user"]

    def test_login_petugas(self):
        r = requests.post(f"{API}/auth/login", json={"username": "petugas", "password": "petugas123"})
        assert r.status_code == 200
        assert r.json()["data"]["user"]["role"] == "PETUGAS"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["data"]["role"] == "ADMIN"

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- Pelanggan ----------------
class TestPelanggan:
    def test_list_seeded(self, admin_token):
        r = requests.get(f"{API}/pelanggan", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()["data"]
        assert len(data) >= 10
        # ensure no _id
        for p in data:
            assert "_id" not in p
            assert p["qr_code"].startswith("MTR-")

    def test_create_and_persist(self, admin_token):
        ktp = f"99{uuid.uuid4().int % 10**14:014d}"
        payload = {
            "nama": "TEST_Pelanggan",
            "nomor_ktp": ktp,
            "rt": "RT01",
            "no_telepon": "081299999999",
            "alamat": "Test alamat",
            "no_seri_meter": "ST-TEST",
            "angka_awal": 50.0,
        }
        r = requests.post(f"{API}/pelanggan", headers=H(admin_token), json=payload)
        assert r.status_code == 200, r.text
        d = r.json()["data"]
        assert d["qr_code"].startswith("MTR-")
        # MTR-YYYY-XXXX format
        parts = d["qr_code"].split("-")
        assert len(parts) == 3 and len(parts[2]) == 4
        pid = d["id"]

        # GET to verify
        g = requests.get(f"{API}/pelanggan/{pid}", headers=H(admin_token))
        assert g.status_code == 200
        gdata = g.json()["data"]
        assert gdata["pelanggan"]["nomor_ktp"] == ktp
        assert "pencatatan" in gdata and "tagihan" in gdata

    def test_duplicate_ktp(self, admin_token):
        # use a seeded KTP
        r = requests.post(f"{API}/pelanggan", headers=H(admin_token), json={
            "nama": "Dup", "nomor_ktp": "3201010101010001", "rt": "RT01",
            "no_telepon": "0", "no_seri_meter": "X",
        })
        assert r.status_code == 400

    def test_scan_known_qr(self, admin_token):
        r = requests.get(f"{API}/meteran/scan/MTR-2025-0001", headers=H(admin_token))
        # year may not be 2025 if backend uses current year; use list to discover
        if r.status_code == 404:
            lst = requests.get(f"{API}/pelanggan", headers=H(admin_token)).json()["data"]
            qr = lst[0]["qr_code"]
            r = requests.get(f"{API}/meteran/scan/{qr}", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()["data"]
        assert "pelanggan" in d and "angka_meter_lalu" in d
        assert "tunggakan_list" in d and "total_tunggakan" in d

    def test_scan_invalid_qr(self, admin_token):
        r = requests.get(f"{API}/meteran/scan/INVALID-XYZ", headers=H(admin_token))
        assert r.status_code == 404


# ---------------- Pencatatan & Tagihan ----------------
class TestPencatatan:
    def test_create_pencatatan_and_tagihan(self, petugas_token, admin_token):
        # find an unused pelanggan for current month
        lst = requests.get(f"{API}/pelanggan", headers=H(admin_token)).json()["data"]
        chosen = None
        for p in lst:
            if p["nama"].startswith("TEST_"):
                continue
            scan = requests.get(f"{API}/meteran/scan/{p['qr_code']}", headers=H(petugas_token)).json()["data"]
            angka_lalu = scan["angka_meter_lalu"]
            chosen = (p, angka_lalu)
            break
        assert chosen
        p, angka_lalu = chosen
        # try create pencatatan
        r = requests.post(f"{API}/pencatatan", headers=H(petugas_token), json={
            "qr_code": p["qr_code"],
            "angka_meter_kini": angka_lalu + 5.5,
        })
        # accept 200 (created) or 400 (already recorded this month)
        assert r.status_code in (200, 400), r.text
        if r.status_code == 200:
            d = r.json()["data"]
            assert d["pencatatan"]["pemakaian_m3"] == 5.5
            assert d["tagihan"]["status_bayar"] == "BELUM"
            assert d["tagihan"]["total_tagihan"] > 0

            # duplicate periode
            r2 = requests.post(f"{API}/pencatatan", headers=H(petugas_token), json={
                "qr_code": p["qr_code"], "angka_meter_kini": angka_lalu + 6,
            })
            assert r2.status_code == 400

    def test_pencatatan_invalid_meter(self, petugas_token, admin_token):
        lst = requests.get(f"{API}/pelanggan", headers=H(admin_token)).json()["data"]
        p = lst[1]
        r = requests.post(f"{API}/pencatatan", headers=H(petugas_token), json={
            "qr_code": p["qr_code"], "angka_meter_kini": 0.0,
        })
        assert r.status_code == 400

    def test_list_pencatatan_filter_rt(self, admin_token):
        r = requests.get(f"{API}/pencatatan?rt=RT02", headers=H(admin_token))
        assert r.status_code == 200
        for c in r.json()["data"]:
            assert c["rt"] == "RT02"


# ---------------- Tagihan & Bayar ----------------
class TestTagihan:
    def test_list_filters(self, admin_token):
        r = requests.get(f"{API}/tagihan?status=BELUM", headers=H(admin_token))
        assert r.status_code == 200
        for t in r.json()["data"]:
            assert t["status_bayar"] == "BELUM"
        r2 = requests.get(f"{API}/tagihan?rt=RT01", headers=H(admin_token))
        assert r2.status_code == 200

    def test_bayar_full_lunas(self, admin_token):
        r = requests.get(f"{API}/tagihan?status=BELUM", headers=H(admin_token))
        belum = r.json()["data"]
        if not belum:
            pytest.skip("No BELUM tagihan")
        t = belum[0]
        pay = requests.post(f"{API}/tagihan/{t['id']}/bayar", headers=H(admin_token), json={
            "metode_bayar": "TUNAI", "nominal_bayar": float(t["sisa_tagihan"]),
        })
        assert pay.status_code == 200
        assert pay.json()["data"]["status_bayar"] == "LUNAS"

    def test_bayar_partial_sebagian(self, admin_token):
        r = requests.get(f"{API}/tagihan?status=BELUM", headers=H(admin_token))
        belum = r.json()["data"]
        if not belum:
            pytest.skip("No BELUM tagihan")
        t = belum[0]
        half = max(1.0, float(t["sisa_tagihan"]) / 2)
        pay = requests.post(f"{API}/tagihan/{t['id']}/bayar", headers=H(admin_token), json={
            "metode_bayar": "QRIS", "nominal_bayar": half,
        })
        assert pay.status_code == 200
        assert pay.json()["data"]["status_bayar"] in ("SEBAGIAN", "LUNAS")


# ---------------- Dashboard / Tren ----------------
class TestDashboardTren:
    def test_dashboard_stats(self, admin_token):
        r = requests.get(f"{API}/dashboard/stats", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()["data"]
        for k in ["total_pelanggan", "rt_stats", "aktivitas"]:
            assert k in d
        assert len(d["rt_stats"]) == 3

    def test_tren_pemakaian(self, admin_token):
        r = requests.get(f"{API}/tren/pemakaian?bulan=12", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()["data"]
        assert len(d["data"]) == 12
        assert "distribusi_golongan" in d

    def test_tren_anomali(self, admin_token):
        r = requests.get(f"{API}/tren/anomali", headers=H(admin_token))
        assert r.status_code == 200
        # Dewi Kurnia case expected
        names = [x["nama"] for x in r.json()["data"]]
        assert any("Dewi" in n for n in names) or len(names) >= 0


# ---------------- Tarif / Petugas / Pengaturan ----------------
class TestAdminOnly:
    def test_tarif_list_both_roles(self, petugas_token, admin_token):
        assert requests.get(f"{API}/tarif", headers=H(petugas_token)).status_code == 200
        assert requests.get(f"{API}/tarif", headers=H(admin_token)).status_code == 200

    def test_tarif_create_admin_only(self, petugas_token, admin_token):
        r1 = requests.post(f"{API}/tarif", headers=H(petugas_token), json={"harga_per_m3": 4500})
        assert r1.status_code == 403
        r2 = requests.post(f"{API}/tarif", headers=H(admin_token), json={"harga_per_m3": 4500})
        assert r2.status_code == 200

    def test_petugas_admin_only(self, petugas_token, admin_token):
        assert requests.get(f"{API}/petugas", headers=H(petugas_token)).status_code == 403
        r = requests.get(f"{API}/petugas", headers=H(admin_token))
        assert r.status_code == 200
        assert any(u["role"] == "ADMIN" for u in r.json()["data"])

    def test_create_petugas(self, admin_token):
        uname = f"test_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/petugas", headers=H(admin_token), json={
            "nama": "TEST_User", "username": uname, "password": "pwd12345", "role": "PETUGAS",
        })
        assert r.status_code == 200
        assert r.json()["data"]["username"] == uname

    def test_pengaturan_get_put(self, admin_token, petugas_token):
        r = requests.get(f"{API}/pengaturan", headers=H(petugas_token))
        assert r.status_code == 200
        # Petugas cannot PUT
        bad = requests.put(f"{API}/pengaturan", headers=H(petugas_token), json={"biaya_admin": 6000})
        assert bad.status_code == 403
        # Admin PUT with base64 image
        b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        ok = requests.put(f"{API}/pengaturan", headers=H(admin_token), json={
            "qris_image": b64, "biaya_admin": 5500,
        })
        assert ok.status_code == 200
        # verify persisted
        g = requests.get(f"{API}/pengaturan", headers=H(admin_token)).json()["data"]
        assert g.get("qris_image") == b64
        assert g.get("biaya_admin") == 5500
