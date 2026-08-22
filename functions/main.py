"""
SPAB KRL Ragam Berseri - Firebase Cloud Functions Backend
"""

import os
import uuid
import logging
import bcrypt
import urllib.request
import urllib.error
import json as _json
from datetime import datetime, timezone, timedelta
from typing import Optional
from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app, firestore, auth as firebase_auth

initialize_app()
set_global_options(region="asia-southeast2", memory=512, timeout_sec=60)
logger = logging.getLogger("spab")


def get_db():
    return firestore.client()

def now_utc():
    return datetime.now(timezone.utc)

def iso(dt):
    return dt.astimezone(timezone.utc).isoformat()

def month_start(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)

def add_months(dt, n):
    y = dt.year + (dt.month - 1 + n) // 12
    m = (dt.month - 1 + n) % 12 + 1
    return dt.replace(year=y, month=m, day=1)

def parse_periode(s):
    """Parse string periode dari frontend → ISO awal bulan UTC. Fallback ke bulan ini."""
    if not s:
        return iso(month_start(now_utc()))
    try:
        # Normalise: ganti Z dengan +00:00 lalu fromisoformat
        cleaned = s.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        return iso(datetime(dt.year, dt.month, 1, tzinfo=timezone.utc))
    except Exception:
        return iso(month_start(now_utc()))

def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain, hashed):
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def ok(data=None, message="OK"):
    return {"success": True, "data": data, "message": message}

def err(message, status=400):
    return {"success": False, "data": None, "message": message}, status

def verify_token(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        decoded = firebase_auth.verify_id_token(token)
        uid = decoded["uid"]
        db = get_db()
        doc = db.collection("users").document(uid).get()
        if not doc.exists:
            return None
        user = doc.to_dict()
        if not user.get("aktif", True):
            return None
        user["_doc_id"] = uid
        return user
    except Exception as e:
        logger.warning("Token error: %s", e)
        return None

def require_auth(request):
    user = verify_token(request)
    if not user:
        return None, ({"success": False, "message": "Tidak terotentikasi"}, 401)
    return user, None

def require_role(request, *roles):
    user, error = require_auth(request)
    if error:
        return None, error
    if user["role"] not in roles:
        return None, ({"success": False, "message": "Akses ditolak"}, 403)
    return user, None

def find_one(db, collection, field, value):
    docs = db.collection(collection).where(field, "==", value).limit(1).stream()
    for doc in docs:
        return {"_doc_id": doc.id, **doc.to_dict()}
    return None

def add_cors(response_data, status=200):
    """Tambah CORS headers ke semua response."""
    import json
    from datetime import date
    from firebase_functions.https_fn import Response

    CORS_HEADERS = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "3600",
    }

    # Handle OPTIONS preflight
    if isinstance(response_data, dict) and response_data == {}:
        return Response("", status=204, headers=CORS_HEADERS)

    if isinstance(response_data, tuple):
        body, status = response_data
    else:
        body = response_data

    class FirestoreEncoder(json.JSONEncoder):
        """Handle Firestore Timestamp, datetime, date, dan tipe non-serializable lain."""
        def default(self, obj):
            # Firestore DatetimeWithNanoseconds / google.cloud.firestore_v1.base_document.Timestamp
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            # google.cloud.firestore_v1 Timestamp (punya method .seconds / .nanos)
            if hasattr(obj, 'seconds') and hasattr(obj, 'nanos'):
                from datetime import timezone
                dt = datetime.fromtimestamp(obj.seconds, tz=timezone.utc)
                return dt.isoformat()
            # date object
            if isinstance(obj, date):
                return obj.isoformat()
            return super().default(obj)

    headers = {**CORS_HEADERS, "Content-Type": "application/json"}
    try:
        serialized = json.dumps(body, cls=FirestoreEncoder)
    except Exception as e:
        logger.error("JSON serialization error: %s", e)
        serialized = json.dumps({"success": False, "data": None, "message": f"Serialization error: {str(e)}"})
        status = 500
    return Response(serialized, status=status, headers=headers)

def _tarif_aktif(db):
    docs = db.collection("tarif").order_by("berlaku_mulai", direction=firestore.Query.DESCENDING).limit(1).stream()
    for doc in docs:
        return float(doc.to_dict().get("harga_per_m3", 5000))
    return 5000.0

def _biaya_admin(db):
    doc = db.collection("pengaturan").document("main").get()
    if doc.exists:
        return float(doc.to_dict().get("biaya_admin", 5000))
    return 5000.0

def _next_qr_code(db):
    year = datetime.now().year
    count = len(list(db.collection("pelanggan").stream())) + 1
    return f"MTR-{year}-{count:04d}"

def _firebase_sign_in(email, password):
    api_key = os.environ.get("APP_API_KEY", "")
    if not api_key:
        raise Exception("APP_API_KEY belum di-set di functions/.env")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = _json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return _json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = _json.loads(e.read().decode("utf-8"))
        raise Exception(body.get("error", {}).get("message", "Auth gagal"))


# ===========================================================================
# AUTH
# ===========================================================================

@https_fn.on_request()
def auth_login(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    if req.method != "POST":
        return add_cors(err("Method not allowed", 405))
    body = req.get_json(silent=True) or {}
    username = (body.get("username") or "").lower()
    password = body.get("password") or ""
    db = get_db()
    user = find_one(db, "users", "username", username)
    if not user:
        return add_cors(err("Username atau password salah", 401))
    if not user.get("aktif", True):
        return add_cors(err("Akun tidak aktif", 401))
    if not verify_password(password, user.get("password_hash", "")):
        return add_cors(err("Username atau password salah", 401))
    uid = user["_doc_id"]
    email = f"{username}@spab.internal"
    try:
        auth_result = _firebase_sign_in(email, password)
        id_token = auth_result["idToken"]
        refresh_token = auth_result.get("refreshToken", "")
    except Exception as e:
        logger.error("Firebase sign in error: %s", e)
        try:
            firebase_auth.update_user(uid, password=password)
            auth_result = _firebase_sign_in(email, password)
            id_token = auth_result["idToken"]
            refresh_token = auth_result.get("refreshToken", "")
        except Exception as e2:
            logger.error("Fallback error: %s", e2)
            return add_cors(err(f"Gagal autentikasi: {str(e2)}", 500))
    safe_user = {k: v for k, v in user.items() if k not in ("password_hash", "_doc_id", "_id")}
    safe_user["id"] = uid
    return add_cors(ok({"id_token": id_token, "refresh_token": refresh_token, "user": safe_user}, "Login berhasil"))


@https_fn.on_request()
def auth_me(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_auth(req)
    if error:
        return add_cors(error)
    safe = {k: v for k, v in user.items() if k not in ("password_hash", "_doc_id")}
    return add_cors(ok(safe))


@https_fn.on_request()
def auth_ganti_password(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    if req.method != "POST":
        return add_cors(err("Method not allowed", 405))
    user, error = require_auth(req)
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    password_lama = body.get("password_lama", "")
    password_baru = body.get("password_baru", "")
    if not password_lama or not password_baru:
        return add_cors(err("Password lama dan baru harus diisi", 400))
    if len(password_baru) < 6:
        return add_cors(err("Password baru minimal 6 karakter", 400))
    if not verify_password(password_lama, user.get("password_hash", "")):
        return add_cors(err("Password lama tidak sesuai", 401))
    uid = user.get("_doc_id", "")
    db = get_db()
    db.collection("users").document(uid).update({"password_hash": hash_password(password_baru)})
    try:
        firebase_auth.update_user(uid, password=password_baru)
    except Exception as e:
        logger.warning("Firebase Auth password update: %s", e)
    return add_cors(ok(None, "Password berhasil diubah"))


# ===========================================================================
# PELANGGAN
# ===========================================================================

@https_fn.on_request()
def pelanggan_list(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    db = get_db()
    query = db.collection("pelanggan")
    rt = req.args.get("rt")
    if rt:
        query = query.where("rt", "==", rt)
    docs = query.order_by("nama").stream()
    q_filter = (req.args.get("q") or "").lower()
    result = []
    for doc in docs:
        d = {"id": doc.id, **doc.to_dict()}
        if q_filter:
            if (q_filter in d.get("nama", "").lower() or
                    q_filter in d.get("nomor_ktp", "").lower() or
                    q_filter in d.get("qr_code", "").lower()):
                result.append(d)
        else:
            result.append(d)
    return add_cors(ok(result))


@https_fn.on_request()
def pelanggan_create(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    db = get_db()
    existing = find_one(db, "pelanggan", "nomor_ktp", body.get("nomor_ktp"))
    if existing:
        return add_cors(err("Nomor KTP sudah terdaftar", 400))
    pid = str(uuid.uuid4())
    qr_code = _next_qr_code(db)
    angka_awal = float(body.get("angka_awal", 0))
    doc = {
        "nama": body.get("nama", ""),
        "nomor_ktp": body.get("nomor_ktp", ""),
        "rt": body.get("rt", "RT01"),
        "no_telepon": body.get("no_telepon", ""),
        "alamat": body.get("alamat", ""),
        "golongan": body.get("golongan", "RUMAH_TANGGA"),
        "no_seri_meter": body.get("no_seri_meter", ""),
        "angka_awal": angka_awal,
        "angka_meter_terakhir": angka_awal,
        "foto_lokasi": body.get("foto_lokasi"),
        "qr_code": qr_code,
        "status_aktif": True,
        "tanggal_daftar": iso(now_utc()),
        "tanggal_pasang": iso(now_utc()),
    }
    db.collection("pelanggan").document(pid).set(doc)
    doc["id"] = pid
    return add_cors(ok(doc, "Pelanggan berhasil ditambahkan"))


@https_fn.on_request()
def pelanggan_detail(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    pid = req.args.get("id") or ""
    db = get_db()
    doc = db.collection("pelanggan").document(pid).get()
    if not doc.exists:
        return add_cors(err("Pelanggan tidak ditemukan", 404))
    p = {"id": doc.id, **doc.to_dict()}
    histori_raw = [{"id": d.id, **d.to_dict()} for d in
               db.collection("pencatatan").where("id_pelanggan", "==", pid).limit(24).stream()]
    histori = sorted(histori_raw, key=lambda x: x.get("periode_bulan", ""), reverse=True)
    tagihan_raw = [{"id": d.id, **d.to_dict()} for d in
               db.collection("tagihan").where("id_pelanggan", "==", pid).limit(24).stream()]
    tagihan = sorted(tagihan_raw, key=lambda x: x.get("periode_bulan", ""), reverse=True)
    return add_cors(ok({"pelanggan": p, "pencatatan": histori, "tagihan": tagihan}))


@https_fn.on_request()
def pelanggan_update(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    pid = req.args.get("id") or ""
    body = req.get_json(silent=True) or {}
    allowed = ["nama", "nomor_ktp", "rt", "no_telepon", "alamat", "golongan", "status_aktif"]
    upd = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not upd:
        return add_cors(err("Tidak ada data yang diubah", 400))
    db = get_db()
    ref = db.collection("pelanggan").document(pid)
    if not ref.get().exists:
        return add_cors(err("Pelanggan tidak ditemukan", 404))
    ref.update(upd)
    doc = ref.get().to_dict()
    doc["id"] = pid
    return add_cors(ok(doc, "Pelanggan diperbarui"))


# ===========================================================================
# METERAN
# ===========================================================================
# ===========================================================================
# PENCATATAN
# ===========================================================================

@https_fn.on_request()
def pencatatan_create(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    db = get_db()
    qr_code = body.get("qr_code", "")
    p = find_one(db, "pelanggan", "qr_code", qr_code)
    if not p:
        return add_cors(err("QR Code tidak dikenali", 404))
    pid = p["_doc_id"]
    p["id"] = pid
    # Baca periode dari body request; fallback ke bulan ini
    periode = parse_periode(body.get("periode"))
    # Cek duplikat dengan prefix YYYY-MM untuk handle format JS vs Python
    all_catat_pid = list(db.collection("pencatatan").where("id_pelanggan", "==", pid).stream())
    dup = [d for d in all_catat_pid if d.to_dict().get("periode_bulan","")[:7] == periode[:7]]
    if dup:
        return add_cors(err(f"Pelanggan ini sudah dicatat untuk periode {periode[:7]}", 400))
    last_docs = list(db.collection("pencatatan").where("id_pelanggan", "==", pid)
                     .order_by("periode_bulan", direction=firestore.Query.DESCENDING).limit(1).stream())
    last = last_docs[0].to_dict() if last_docs else None
    angka_lalu = float(last["angka_meter_akhir"]) if last else float(p.get("angka_awal", 0))
    angka_kini = float(body.get("angka_meter_akhir", 0))
    if angka_kini < angka_lalu:
        return add_cors(err(f"Angka meter akhir ({angka_kini}) < meter awal ({angka_lalu})", 400))
    pemakaian = round(angka_kini - angka_lalu, 2)
    hist = list(db.collection("pencatatan").where("id_pelanggan", "==", pid)
                .order_by("periode_bulan", direction=firestore.Query.DESCENDING).limit(3).stream())
    hist_data = [h.to_dict() for h in hist]
    rata2 = 0.0
    is_anomali = False
    if hist_data:
        rata2 = sum(float(h["pemakaian_m3"]) for h in hist_data) / len(hist_data)
        if rata2 > 0 and pemakaian > rata2 * 2:
            is_anomali = True
    cid = str(uuid.uuid4())
    catat_doc = {
        "id_pelanggan": pid, "id_petugas": user.get("_doc_id", ""),
        "qr_code": qr_code, "periode_bulan": periode,
        "angka_meter_awal": angka_lalu, "angka_meter_akhir": angka_kini,
        "pemakaian_m3": pemakaian, "foto_meter": body.get("foto_meter"),
        "koordinat_gps": body.get("koordinat_gps"), "catatan": body.get("catatan", ""),
        "is_anomali": is_anomali, "rata_rata_historis": round(rata2, 2),
        "waktu_catat": iso(now_utc()),
    }
    db.collection("pencatatan").document(cid).set(catat_doc)
    db.collection("pelanggan").document(pid).update({"angka_meter_terakhir": angka_kini})
    tarif = _tarif_aktif(db)
    biaya_admin = _biaya_admin(db)
    biaya_air = round(pemakaian * tarif, 0)
    total = biaya_air + biaya_admin
    tid = str(uuid.uuid4())
    tag_doc = {
        "id_pencatatan": cid, "id_pelanggan": pid,
        "nama_pelanggan": p.get("nama", "-"), "rt": p.get("rt", "-"),
        "qr_code": qr_code,
        "nomor_tagihan": f"TAG-{datetime.fromisoformat(periode.replace('+00:00','+00:00')).strftime('%y%m')}-{qr_code.split('-')[-1]}",
        "periode_bulan": periode, "pemakaian_m3": pemakaian,
        "tarif_per_m3": tarif, "biaya_air": biaya_air,
        "biaya_admin": biaya_admin, "total_tagihan": total,
        "sisa_tagihan": total, "status_bayar": "BELUM",
        "metode_bayar": None, "tanggal_bayar": None,
        "id_petugas_bayar": None, "bukti_bayar": None,
        "dibuat_pada": iso(now_utc()),
    }
    db.collection("tagihan").document(tid).set(tag_doc)
    catat_doc["id"] = cid
    tag_doc["id"] = tid
    return add_cors(ok({"pencatatan": catat_doc, "tagihan": tag_doc, "is_anomali": is_anomali}, "Pencatatan berhasil disimpan"))


@https_fn.on_request()
def pencatatan_list(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    db = get_db()
    query = db.collection("pencatatan")
    periode = req.args.get("periode")
    if periode:
        # Normalisasi: ambil prefix YYYY-MM-DD untuk match format berbeda dari JS vs Python
        periode_prefix = periode[:7]  # "2026-05"
        # Filter semua dokumen lalu filter di Python berdasarkan prefix
        docs_all = query.limit(5000).stream()
        result = []
        for doc in docs_all:
            d = {"id": doc.id, **doc.to_dict()}
            if d.get("periode_bulan", "")[:7] != periode_prefix:
                continue
            p_doc = db.collection("pelanggan").document(d["id_pelanggan"]).get()
            rt = req.args.get("rt")
            if rt and (not p_doc.exists or p_doc.to_dict().get("rt") != rt):
                continue
            if p_doc.exists:
                d["nama_pelanggan"] = p_doc.to_dict().get("nama", "-")
                d["rt"] = p_doc.to_dict().get("rt", "-")
            result.append(d)
        result.sort(key=lambda x: x.get("waktu_catat", ""), reverse=True)
        return add_cors(ok(result))
    rt = req.args.get("rt")
    # Kalau ada filter periode, tidak bisa order_by field lain (butuh composite index)
    if periode:
        docs = query.limit(5000).stream()
    else:
        docs = query.order_by("waktu_catat", direction=firestore.Query.DESCENDING).limit(5000).stream()
    result = []
    for doc in docs:
        d = {"id": doc.id, **doc.to_dict()}
        p = db.collection("pelanggan").document(d["id_pelanggan"]).get()
        if rt and (not p.exists or p.to_dict().get("rt") != rt):
            continue
        if p.exists:
            d["nama_pelanggan"] = p.to_dict().get("nama", "-")
            d["rt"] = p.to_dict().get("rt", "-")
        result.append(d)
    # Sort di Python setelah ambil data
    result.sort(key=lambda x: x.get("waktu_catat", ""), reverse=True)
    return add_cors(ok(result))


# ===========================================================================
# TAGIHAN
# ===========================================================================

@https_fn.on_request()
def tagihan_list(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    db = get_db()
    query = db.collection("tagihan")
    status = req.args.get("status")
    if status:
        query = query.where("status_bayar", "==", status)
    rt = req.args.get("rt")
    if rt:
        query = query.where("rt", "==", rt)
    periode = req.args.get("periode")
    periode_prefix = periode[:7] if periode else None  # "2026-05" atau None
    q_filter = (req.args.get("q") or "").lower()

    docs = query.order_by("periode_bulan", direction=firestore.Query.DESCENDING).limit(5000).stream()
    result = []
    for doc in docs:
        d = {"id": doc.id, **doc.to_dict()}
        # Filter periode dengan prefix YYYY-MM
        if periode_prefix and d.get("periode_bulan", "")[:7] != periode_prefix:
            continue
        if q_filter:
            if (q_filter in d.get("nama_pelanggan", "").lower() or
                    q_filter in d.get("nomor_tagihan", "").lower() or
                    q_filter in d.get("qr_code", "").lower()):
                result.append(d)
        else:
            result.append(d)
    return add_cors(ok(result))


@https_fn.on_request()
def tagihan_detail(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    tid = req.args.get("id") or ""
    if not tid:
        return add_cors(err("ID tagihan diperlukan", 400))
    db = get_db()
    try:
        t_doc = db.collection("tagihan").document(tid).get()
        if not t_doc.exists:
            return add_cors(err("Tagihan tidak ditemukan", 404))
        t = {"id": t_doc.id, **t_doc.to_dict()}
        # Ambil data pelanggan
        id_pelanggan = t.get("id_pelanggan", "")
        p = {}
        if id_pelanggan:
            p_doc = db.collection("pelanggan").document(id_pelanggan).get()
            if p_doc.exists:
                p = {"id": p_doc.id, **p_doc.to_dict()}
        # Ambil pengaturan
        s_doc = db.collection("pengaturan").document("main").get()
        s = s_doc.to_dict() if s_doc.exists else {}
        # Enrich tagihan dengan angka meter dari pencatatan jika belum ada
        if not t.get("angka_meter_awal") and not t.get("angka_meter_akhir"):
            id_pencatatan = t.get("id_pencatatan", "")
            if id_pencatatan:
                c_doc = db.collection("pencatatan").document(id_pencatatan).get()
                if c_doc.exists:
                    c = c_doc.to_dict()
                    t["angka_meter_awal"] = c.get("angka_meter_awal", 0)
                    t["angka_meter_akhir"] = c.get("angka_meter_akhir", 0)
        # Pastikan field yang diperlukan nota selalu ada
        t.setdefault("angka_meter_awal", 0)
        t.setdefault("angka_meter_akhir", 0)
        t.setdefault("pemakaian_m3", 0)
        t.setdefault("tarif_per_m3", 0)
        t.setdefault("biaya_air", 0)
        t.setdefault("biaya_admin", 0)
        t.setdefault("total_tagihan", 0)
        t.setdefault("sisa_tagihan", t.get("total_tagihan", 0))
        return add_cors(ok({"tagihan": t, "pelanggan": p, "pengaturan": s}))
    except Exception as e:
        logger.error("tagihan_detail error: %s", e)
        return add_cors(err(f"Terjadi kesalahan: {str(e)}", 500))


@https_fn.on_request()
def tagihan_bayar(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    # Ambil id dari body JSON (POST) atau query param (GET), keduanya didukung
    tid = body.get("id") or req.args.get("id") or ""
    if not tid:
        return add_cors(err("ID tagihan diperlukan", 400))
    db = get_db()
    ref = db.collection("tagihan").document(tid)
    t_doc = ref.get()
    if not t_doc.exists:
        return add_cors(err("Tagihan tidak ditemukan", 404))
    t = t_doc.to_dict()
    if t["status_bayar"] == "LUNAS":
        return add_cors(err("Tagihan sudah lunas", 400))
    sisa = float(t.get("sisa_tagihan") or t["total_tagihan"])
    nominal = float(body.get("nominal_bayar", 0))
    if nominal <= 0:
        return add_cors(err("Nominal harus > 0", 400))
    new_sisa = max(sisa - nominal, 0)
    status_bayar = "LUNAS" if new_sisa == 0 else "SEBAGIAN"

    # Konversi tanggal_bayar lama ke string jika berupa Timestamp Firestore
    existing_tanggal = t.get("tanggal_bayar")
    if existing_tanggal and hasattr(existing_tanggal, 'isoformat'):
        existing_tanggal = existing_tanggal.isoformat()
    elif existing_tanggal and hasattr(existing_tanggal, 'seconds'):
        from datetime import timezone as tz
        existing_tanggal = datetime.fromtimestamp(existing_tanggal.seconds, tz=tz.utc).isoformat()

    upd = {
        "sisa_tagihan": new_sisa,
        "status_bayar": status_bayar,
        "metode_bayar": body.get("metode_bayar"),
        "tanggal_bayar": iso(now_utc()) if status_bayar == "LUNAS" else existing_tanggal,
        "id_petugas_bayar": user.get("_doc_id", ""),
        "bukti_bayar": body.get("bukti_bayar") or t.get("bukti_bayar"),
        "nominal_terbayar": float(t.get("nominal_terbayar") or 0) + nominal,
    }
    ref.update(upd)
    t.update(upd)
    t["id"] = tid
    return add_cors(ok(t, "Pembayaran berhasil dicatat"))


# ===========================================================================
# DASHBOARD
# ===========================================================================

@https_fn.on_request()
def dashboard_stats(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    db = get_db()

    # KPI cards: selalu pakai bulan ini
    periode_kpi = iso(month_start(now_utc()))
    periode_kpi_prefix = periode_kpi[:7]

    # Pencatatan/progres RT: gunakan parameter pencatatan_periode, default bulan sebelumnya
    raw_periode_catat = req.args.get("pencatatan_periode", "")
    if raw_periode_catat:
        try:
            cleaned = raw_periode_catat.strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            periode_catat = iso(datetime(dt.year, dt.month, 1, tzinfo=timezone.utc))
        except Exception:
            prev = add_months(month_start(now_utc()), -1)
            periode_catat = iso(prev)
    else:
        prev = add_months(month_start(now_utc()), -1)
        periode_catat = iso(prev)
    periode_catat_prefix = periode_catat[:7]

    total_pel = len(list(db.collection("pelanggan").where("status_aktif", "==", True).stream()))
    all_pencatatan = [d.to_dict() for d in db.collection("pencatatan").stream()]
    all_tagihan_data = [d.to_dict() for d in db.collection("tagihan").stream()]

    # Total pencatatan untuk periode_catat (dipakai di statistik Dicatat/Belum)
    total_catat = sum(1 for d in all_pencatatan if d.get("periode_bulan","")[:7] == periode_catat_prefix)

    tagihan_bulan = [t for t in all_tagihan_data if t.get("periode_bulan","")[:7] == periode_kpi_prefix]
    total_tagihan = sum(float(x["total_tagihan"]) for x in tagihan_bulan)
    total_lunas = sum(float(x["total_tagihan"]) for x in tagihan_bulan if x["status_bayar"] == "LUNAS")
    belum = [d.to_dict() for d in db.collection("tagihan").where("status_bayar", "in", ["BELUM", "SEBAGIAN"]).stream()]
    tunggakan_total = sum(float(x.get("sisa_tagihan", x["total_tagihan"])) for x in belum)

    # Per-RT progress berdasarkan periode_catat
    rt_stats = []
    for rt in ["RT01", "RT02", "RT03"]:
        rt_pel = list(db.collection("pelanggan").where("rt", "==", rt).where("status_aktif", "==", True).stream())
        total_rt = len(rt_pel)
        ids_rt = [d.id for d in rt_pel]
        # Cek siapa yang sudah dicatat di periode_catat
        catat_rt = [d.to_dict() for d in db.collection("pencatatan").where("id_pelanggan", "in", ids_rt[:10]).stream()] if ids_rt else []
        sudah_ids = {d.get("id_pelanggan") for d in catat_rt if d.get("periode_bulan","")[:7] == periode_catat_prefix}
        sudah = len(sudah_ids)
        anomali = sum(1 for d in catat_rt if d.get("periode_bulan","")[:7] == periode_catat_prefix and d.get("is_anomali"))
        # Daftar pelanggan yang belum dicatat
        belum_list = []
        for pel_doc in rt_pel:
            if pel_doc.id not in sudah_ids:
                pd = pel_doc.to_dict()
                belum_list.append({"id": pel_doc.id, "nama": pd.get("nama",""), "rt": pd.get("rt","")})
        rt_stats.append({
            "rt": rt, "total": total_rt, "sudah": sudah, "dicatat": sudah,
            "belum": total_rt - sudah, "anomali": anomali, "belum_list": belum_list
        })

    aktivitas = []
    for c in db.collection("pencatatan").order_by("waktu_catat", direction=firestore.Query.DESCENDING).limit(10).stream():
        cd = c.to_dict()
        p = db.collection("pelanggan").document(cd["id_pelanggan"]).get()
        pdata = p.to_dict() if p.exists else {}
        aktivitas.append({"tipe": "ANOMALI" if cd.get("is_anomali") else "CATAT", "waktu": cd["waktu_catat"],
                          "deskripsi": f"{pdata.get('nama', '-')} ({pdata.get('rt', '-')}) tercatat {cd['pemakaian_m3']} m³"})
    for t in db.collection("tagihan").where("status_bayar", "==", "LUNAS").order_by("periode_bulan", direction=firestore.Query.DESCENDING).limit(10).stream():
        td = t.to_dict()
        aktivitas.append({"tipe": "BAYAR", "waktu": td["tanggal_bayar"],
                          "deskripsi": f"{td['nama_pelanggan']} ({td['rt']}) lunas Rp {int(td['total_tagihan']):,}"})
    aktivitas.sort(key=lambda x: x["waktu"] or "", reverse=True)

    progres_rt = [{"rt": r["rt"], "total": r["total"], "dicatat": r["dicatat"],
                   "belum": r["belum"], "anomali": r["anomali"], "belum_list": r["belum_list"]} for r in rt_stats]

    return add_cors(ok({
        "total_pelanggan": total_pel, "total_pencatatan_bulan": total_catat,
        "total_tagihan_bulan": total_tagihan, "total_terkumpul_bulan": total_lunas,
        "total_tunggakan": tunggakan_total, "jumlah_belum_bayar": len(belum),
        "rt_stats": rt_stats, "progres_rt": progres_rt,
        "pencatatan_periode": periode_catat,
        "aktivitas": aktivitas[:15],
    }))


# ===========================================================================
# TREN
# ===========================================================================

@https_fn.on_request()
def tren_pemakaian(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    db = get_db()
    rt = req.args.get("rt")
    semua = req.args.get("semua", "false").lower() == "true"
    periode_spesifik = req.args.get("periode_spesifik", "")
    bulan = int(req.args.get("bulan", 12))
    start = month_start(now_utc())

    # Tentukan labels berdasarkan mode filter
    if periode_spesifik:
        try:
            cleaned = periode_spesifik.strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            labels = [iso(datetime(dt.year, dt.month, 1, tzinfo=timezone.utc))]
        except Exception:
            labels = [iso(start)]
    elif semua:
        # Ambil semua periode dari database
        all_p = {d.to_dict().get("periode_bulan","") for d in db.collection("pencatatan").stream()}
        all_t = {d.to_dict().get("periode_bulan","") for d in db.collection("tagihan").stream()}
        labels = sorted(p for p in (all_p | all_t) if p)
        if not labels:
            labels = [iso(start)]
    else:
        labels = [iso(add_months(start, -i)) for i in range(bulan - 1, -1, -1)]

    # Filter maksimum 10 label untuk Firestore "in" query
    if len(labels) <= 10:
        pencatatan = [d.to_dict() for d in db.collection("pencatatan").where("periode_bulan", "in", labels).stream()]
        tagihan = [d.to_dict() for d in db.collection("tagihan").where("periode_bulan", "in", labels).stream()]
    else:
        # Untuk "semua" dengan banyak periode, ambil semua lalu filter di Python
        pencatatan = [d.to_dict() for d in db.collection("pencatatan").stream()]
        tagihan = [d.to_dict() for d in db.collection("tagihan").stream()]
        labels_set = set(labels)
        pencatatan = [p for p in pencatatan if p.get("periode_bulan","") in labels_set]
        tagihan = [t for t in tagihan if t.get("periode_bulan","") in labels_set]

    if rt:
        ids_rt = {d.id for d in db.collection("pelanggan").where("rt", "==", rt).stream()}
        pencatatan = [p for p in pencatatan if p["id_pelanggan"] in ids_rt]
        tagihan = [t for t in tagihan if t["id_pelanggan"] in ids_rt]

    data = []
    for lab in labels:
        pem = sum(float(p["pemakaian_m3"]) for p in pencatatan if p["periode_bulan"] == lab)
        terbit = sum(float(t["total_tagihan"]) for t in tagihan if t["periode_bulan"] == lab)
        terkumpul = sum(float(t["total_tagihan"]) for t in tagihan if t["periode_bulan"] == lab and t["status_bayar"] == "LUNAS")
        anomali = sum(1 for p in pencatatan if p["periode_bulan"] == lab and p.get("is_anomali"))
        try:
            label_str = datetime.fromisoformat(lab).strftime("%b %y")
        except Exception:
            label_str = lab[:7]
        data.append({"periode": lab, "label": label_str,
                     "pemakaian_m3": round(pem, 2), "pendapatan_terbit": terbit,
                     "pendapatan_terkumpul": terkumpul, "jumlah_anomali": anomali})
    gol = {}
    for p in pencatatan:
        pel = db.collection("pelanggan").document(p["id_pelanggan"]).get()
        g = (pel.to_dict() or {}).get("golongan", "RUMAH_TANGGA") if pel.exists else "RUMAH_TANGGA"
        gol[g] = gol.get(g, 0) + float(p["pemakaian_m3"])
    distribusi = [{"golongan": k, "total_m3": round(v, 2)} for k, v in gol.items()]
    return add_cors(ok({"data": data, "distribusi_golongan": distribusi}))


@https_fn.on_request()
def tren_anomali(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    db = get_db()
    docs = db.collection("pencatatan").where("is_anomali", "==", True).limit(200).stream()
    out = []
    for doc in docs:
        d = doc.to_dict()
        p = db.collection("pelanggan").document(d["id_pelanggan"]).get()
        if not p.exists:
            continue
        pdata = p.to_dict()
        rata = float(d.get("rata_rata_historis", 0) or 0)
        pem = float(d["pemakaian_m3"])
        selisih = ((pem - rata) / rata * 100) if rata > 0 else 0
        out.append({"id": doc.id, "nama": pdata["nama"], "rt": pdata["rt"],
                    "periode": d["periode_bulan"], "pemakaian_m3": pem,
                    "rata_rata": rata, "persen_selisih": round(selisih, 1)})
    return add_cors(ok(out))


# ===========================================================================
# TARIF
# ===========================================================================

@https_fn.on_request()
def tarif_list(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    db = get_db()
    docs = db.collection("tarif").order_by("berlaku_mulai", direction=firestore.Query.DESCENDING).limit(100).stream()
    return add_cors(ok([{"id": d.id, **d.to_dict()} for d in docs]))


@https_fn.on_request()
def tarif_create(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    db = get_db()
    tid = str(uuid.uuid4())
    doc = {
        "batas_bawah_m3": float(body.get("batas_bawah_m3", 0)),
        "batas_atas_m3": body.get("batas_atas_m3"),
        "harga_per_m3": float(body.get("harga_per_m3", 0)),
        "berlaku_mulai": body.get("berlaku_mulai") or iso(now_utc()),
        "dibuat_pada": iso(now_utc()),
    }
    db.collection("tarif").document(tid).set(doc)
    doc["id"] = tid
    return add_cors(ok(doc, "Tarif berhasil ditambahkan"))


# ===========================================================================
# PETUGAS
# ===========================================================================

@https_fn.on_request()
def petugas_list(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    db = get_db()
    result = []
    for doc in db.collection("users").stream():
        d = {k: v for k, v in doc.to_dict().items() if k != "password_hash"}
        d["id"] = doc.id
        result.append(d)
    return add_cors(ok(result))


@https_fn.on_request()
def petugas_create(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    username = (body.get("username") or "").lower()
    db = get_db()
    existing = find_one(db, "users", "username", username)
    if existing:
        return add_cors(err("Username sudah dipakai", 400))
    try:
        fb_user = firebase_auth.create_user(
            email=f"{username}@spab.internal",
            password=body.get("password", ""),
            display_name=body.get("nama", ""),
        )
        uid = fb_user.uid
    except Exception as e:
        return add_cors(err(f"Gagal membuat akun: {str(e)}", 400))
    doc = {
        "nama": body.get("nama", ""), "username": username,
        "password_hash": hash_password(body.get("password", "")),
        "role": body.get("role", "PETUGAS"), "aktif": True,
        "dibuat_pada": iso(now_utc()),
    }
    db.collection("users").document(uid).set(doc)
    doc["id"] = uid
    doc.pop("password_hash", None)
    return add_cors(ok(doc, "Petugas berhasil ditambahkan"))


# ===========================================================================
# PENGATURAN
# ===========================================================================

@https_fn.on_request()
def pengaturan_get(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)
    db = get_db()
    doc = db.collection("pengaturan").document("main").get()
    return add_cors(ok(doc.to_dict() if doc.exists else {}))


@https_fn.on_request()
def pengaturan_update(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    body = req.get_json(silent=True) or {}
    allowed = ["nama_spab", "alamat_spab", "no_rekening", "nama_bank", "biaya_admin", "qris_image", "no_telepon_admin"]
    upd = {k: v for k, v in body.items() if k in allowed and v is not None}
    db = get_db()
    db.collection("pengaturan").document("main").set(upd, merge=True)
    doc = db.collection("pengaturan").document("main").get().to_dict()
    return add_cors(ok(doc, "Pengaturan disimpan"))


# ===========================================================================
# SEED
# ===========================================================================

@https_fn.on_request()
def seed_init(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return add_cors({})
    secret = req.args.get("secret", "")
    if secret != os.environ.get("SEED_SECRET", "GANTI_SEED_SECRET_ANDA"):
        return add_cors(err("Tidak diizinkan", 403))
    db = get_db()
    results = []
    if not find_one(db, "users", "username", "admin"):
        try:
            fb_user = firebase_auth.create_user(email="admin@spab.internal", password="admin123", display_name="Administrator")
            uid = fb_user.uid
        except Exception:
            uid = str(uuid.uuid4())
        db.collection("users").document(uid).set({"nama": "Administrator", "username": "admin",
            "password_hash": hash_password("admin123"), "role": "ADMIN", "aktif": True, "dibuat_pada": iso(now_utc())})
        results.append("admin user dibuat")
    if not find_one(db, "users", "username", "petugas"):
        try:
            fb_user2 = firebase_auth.create_user(email="petugas@spab.internal", password="petugas123", display_name="Pak Budi")
            uid2 = fb_user2.uid
        except Exception:
            uid2 = str(uuid.uuid4())
        db.collection("users").document(uid2).set({"nama": "Pak Budi", "username": "petugas",
            "password_hash": hash_password("petugas123"), "role": "PETUGAS", "aktif": True, "dibuat_pada": iso(now_utc())})
        results.append("petugas user dibuat")
    if not list(db.collection("tarif").limit(1).stream()):
        db.collection("tarif").document(str(uuid.uuid4())).set({"batas_bawah_m3": 0, "batas_atas_m3": None,
            "harga_per_m3": 4000, "berlaku_mulai": iso(now_utc() - timedelta(days=90)),
            "dibuat_pada": iso(now_utc() - timedelta(days=90))})
        results.append("tarif default dibuat")
    if not db.collection("pengaturan").document("main").get().exists:
        db.collection("pengaturan").document("main").set({"nama_spab": "SPAB KRL Ragam Berseri",
            "alamat_spab": "Perumahan KRL Ragam Berseri, RT 01-03",
            "no_rekening": "1234-5678-9012", "nama_bank": "Bank BRI",
            "biaya_admin": 5000, "qris_image": None, "no_telepon_admin": "6281234567890"})
        results.append("pengaturan default dibuat")
    return add_cors(ok({"selesai": results}, "Seed selesai"))


# ===========================================================================
# ENDPOINT TAMBAHAN
# ===========================================================================

@https_fn.on_request()
def petugas_update(req: https_fn.Request) -> https_fn.Response:
    """PUT /petugas_update?id=xxx — update nama, role, aktif petugas."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    uid = req.args.get("id") or ""
    body = req.get_json(silent=True) or {}
    allowed = ["nama", "role", "aktif"]
    upd = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not upd:
        return add_cors(err("Tidak ada data yang diubah", 400))
    db = get_db()
    ref = db.collection("users").document(uid)
    if not ref.get().exists:
        return add_cors(err("Akun tidak ditemukan", 404))
    ref.update(upd)
    # Sync ke Firebase Auth jika ada perubahan aktif
    if "aktif" in upd:
        try:
            firebase_auth.update_user(uid, disabled=not upd["aktif"])
        except Exception as e:
            logger.warning("Firebase Auth update: %s", e)
    doc = ref.get().to_dict()
    doc.pop("password_hash", None)
    doc["id"] = uid
    return add_cors(ok(doc, "Akun diperbarui"))


@https_fn.on_request()
def petugas_reset_password(req: https_fn.Request) -> https_fn.Response:
    """POST /petugas_reset_password?id=xxx — reset password petugas oleh admin."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    uid = req.args.get("id") or ""
    body = req.get_json(silent=True) or {}
    password_baru = body.get("password_baru", "")
    if len(password_baru) < 6:
        return add_cors(err("Password minimal 6 karakter", 400))
    db = get_db()
    ref = db.collection("users").document(uid)
    if not ref.get().exists:
        return add_cors(err("Akun tidak ditemukan", 404))
    user_data = ref.get().to_dict()
    ref.update({"password_hash": hash_password(password_baru)})
    try:
        firebase_auth.update_user(uid, password=password_baru)
    except Exception as e:
        logger.warning("Firebase Auth password reset: %s", e)
    return add_cors(ok(None, "Password berhasil direset"))


@https_fn.on_request()
def petugas_nonaktif(req: https_fn.Request) -> https_fn.Response:
    """POST /petugas_nonaktif?id=xxx — nonaktifkan akun petugas."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    uid = req.args.get("id") or ""
    db = get_db()
    ref = db.collection("users").document(uid)
    if not ref.get().exists:
        return add_cors(err("Akun tidak ditemukan", 404))
    ref.update({"aktif": False})
    try:
        firebase_auth.update_user(uid, disabled=True)
    except Exception as e:
        logger.warning("Firebase Auth disable: %s", e)
    return add_cors(ok(None, "Akun dinonaktifkan"))


@https_fn.on_request()
def pencatatan_update(req: https_fn.Request) -> https_fn.Response:
    """PUT /pencatatan_update?id=xxx — admin koreksi pencatatan."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    cid = req.args.get("id") or ""
    body = req.get_json(silent=True) or {}
    db = get_db()
    ref = db.collection("pencatatan").document(cid)
    doc = ref.get()
    if not doc.exists:
        return add_cors(err("Pencatatan tidak ditemukan", 404))
    old = doc.to_dict()

    angka_kini = float(body.get("angka_meter_akhir", old["angka_meter_akhir"]))
    angka_lalu = float(old["angka_meter_awal"])
    if angka_kini < angka_lalu:
        return add_cors(err(f"Angka meter akhir ({angka_kini}) < meter awal ({angka_lalu})", 400))

    pemakaian = round(angka_kini - angka_lalu, 2)
    upd = {
        "angka_meter_akhir": angka_kini,
        "pemakaian_m3": pemakaian,
        "catatan": body.get("catatan", old.get("catatan", "")),
        "dikoreksi": True,
        "waktu_koreksi": iso(now_utc()),
    }
    ref.update(upd)

    # Update angka meter terakhir di pelanggan
    db.collection("pelanggan").document(old["id_pelanggan"]).update({"angka_meter_terakhir": angka_kini})

    # Update tagihan terkait
    tagihan_docs = list(db.collection("tagihan").where("id_pencatatan", "==", cid).limit(1).stream())
    if tagihan_docs:
        t_ref = tagihan_docs[0].reference
        t_data = tagihan_docs[0].to_dict()
        tarif = float(t_data.get("tarif_per_m3", _tarif_aktif(db)))
        biaya_admin = float(t_data.get("biaya_admin", _biaya_admin(db)))
        biaya_air = round(pemakaian * tarif, 0)
        total_baru = biaya_air + biaya_admin
        t_ref.update({
            "pemakaian_m3": pemakaian,
            "biaya_air": biaya_air,
            "total_tagihan": total_baru,
            "sisa_tagihan": total_baru if t_data.get("status_bayar") == "BELUM" else t_data.get("sisa_tagihan"),
        })

    result = ref.get().to_dict()
    result["id"] = cid
    return add_cors(ok(result, "Pencatatan dikoreksi"))


@https_fn.on_request()
def pencatatan_hapus(req: https_fn.Request) -> https_fn.Response:
    """POST /pencatatan_hapus?id=xxx — admin hapus pencatatan + tagihan terkait."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)
    cid = req.args.get("id") or ""
    db = get_db()
    ref = db.collection("pencatatan").document(cid)
    doc = ref.get()
    if not doc.exists:
        return add_cors(err("Pencatatan tidak ditemukan", 404))
    old = doc.to_dict()

    # Hapus tagihan terkait
    tagihan_docs = list(db.collection("tagihan").where("id_pencatatan", "==", cid).stream())
    for t in tagihan_docs:
        t.reference.delete()

    # Hapus pencatatan
    ref.delete()

    # Reset angka meter pelanggan ke pencatatan terakhir yang tersisa
    last_raw = list(db.collection("pencatatan")
                     .where("id_pelanggan", "==", old["id_pelanggan"]).limit(50).stream())
    last_raw.sort(key=lambda x: x.to_dict().get("periode_bulan", ""), reverse=True)
    last_docs = last_raw[:1]
    if last_docs:
        angka_terakhir = last_docs[0].to_dict()["angka_meter_akhir"]
    else:
        pel = db.collection("pelanggan").document(old["id_pelanggan"]).get()
        angka_terakhir = pel.to_dict().get("angka_awal", 0) if pel.exists else 0
    db.collection("pelanggan").document(old["id_pelanggan"]).update({"angka_meter_terakhir": angka_terakhir})

    return add_cors(ok(None, "Pencatatan dan tagihan terkait dihapus"))




@https_fn.on_request()
def pelanggan_hapus(req: https_fn.Request) -> https_fn.Response:
    """POST /pelanggan_hapus?id=xxx — hapus pelanggan permanen (admin only)."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN")
    if error:
        return add_cors(error)

    pid = req.args.get("id") or ""
    db = get_db()
    ref = db.collection("pelanggan").document(pid)
    if not ref.get().exists:
        return add_cors(err("Pelanggan tidak ditemukan", 404))

    # Hapus semua pencatatan terkait
    pencatatan_docs = list(db.collection("pencatatan").where("id_pelanggan", "==", pid).stream())
    for d in pencatatan_docs:
        d.reference.delete()

    # Hapus semua tagihan terkait
    tagihan_docs = list(db.collection("tagihan").where("id_pelanggan", "==", pid).stream())
    for d in tagihan_docs:
        d.reference.delete()

    # Hapus pelanggan
    ref.delete()

    return add_cors(ok(None, f"Pelanggan dan {len(pencatatan_docs)} pencatatan, {len(tagihan_docs)} tagihan berhasil dihapus"))

@https_fn.on_request()
def meteran_scan(req: https_fn.Request) -> https_fn.Response:
    """GET /meteran_scan?qr=MTR-xxxx&periode=xxx — scan QR + cek duplikat periode."""
    if req.method == "OPTIONS":
        return add_cors({})
    user, error = require_role(req, "ADMIN", "PETUGAS")
    if error:
        return add_cors(error)

    qr_code = req.args.get("qr") or ""
    periode_req = req.args.get("periode") or iso(month_start(now_utc()))

    db = get_db()
    p = find_one(db, "pelanggan", "qr_code", qr_code)
    if not p:
        return add_cors(err("QR Code tidak dikenali", 404))

    pid = p["_doc_id"]
    p["id"] = pid

    tunggakan_raw = [{"id": d.id, **d.to_dict()} for d in
                 db.collection("tagihan")
                 .where("id_pelanggan", "==", pid)
                 .where("status_bayar", "in", ["BELUM", "SEBAGIAN"]).stream()]
    tunggakan = sorted(tunggakan_raw, key=lambda x: x.get("periode_bulan", ""))
    total_tunggakan = sum(float(t.get("sisa_tagihan", t["total_tagihan"])) for t in tunggakan)

    last_docs = list(db.collection("pencatatan").where("id_pelanggan", "==", pid)
                     .order_by("periode_bulan", direction=firestore.Query.DESCENDING).limit(1).stream())
    last = last_docs[0].to_dict() if last_docs else None
    angka_lalu = last["angka_meter_akhir"] if last else p.get("angka_awal", 0)

    # Cek duplikat periode
    dup = list(db.collection("pencatatan")
               .where("id_pelanggan", "==", pid)
               .where("periode_bulan", "==", periode_req).limit(1).stream())
    sudah_dicatat = len(dup) > 0

    return add_cors(ok({
        "pelanggan": p,
        "angka_meter_awal": angka_lalu,
        "periode_lalu": last["periode_bulan"] if last else None,
        "tunggakan_list": tunggakan,
        "total_tunggakan": total_tunggakan,
        "sudah_dicatat_periode": sudah_dicatat,
    }))