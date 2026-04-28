from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict

# ---------------------------------------------------------------------------
# DB + App
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="SPAB KRL Ragam Berseri API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_EXPIRES_DAYS = int(os.environ.get("JWT_EXPIRES_DAYS", "7"))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(days=JWT_EXPIRES_DAYS)).timestamp()),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def ok(data=None, message="OK"):
    return {"success": True, "data": data, "message": message}


def month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)


def add_months(dt: datetime, n: int) -> datetime:
    y = dt.year + (dt.month - 1 + n) // 12
    m = (dt.month - 1 + n) % 12 + 1
    return dt.replace(year=y, month=m, day=1)


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Tidak terotentikasi")
    try:
        payload = pyjwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or not user.get("aktif", True):
        raise HTTPException(status_code=401, detail="User tidak ditemukan")
    return user


def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak")
        return user

    return checker


require_admin = require_role("ADMIN")
require_any = require_role("ADMIN", "PETUGAS")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
RT = Literal["RT01", "RT02", "RT03"]


class LoginInput(BaseModel):
    username: str
    password: str


class PelangganCreate(BaseModel):
    nama: str
    nomor_ktp: str
    rt: RT
    no_telepon: str
    alamat: Optional[str] = ""
    golongan: Optional[str] = "RUMAH_TANGGA"  # RUMAH_TANGGA | USAHA | SOSIAL
    no_seri_meter: str
    angka_awal: float = 0.0
    foto_lokasi: Optional[str] = None  # base64 data URL


class PelangganUpdate(BaseModel):
    nama: Optional[str] = None
    nomor_ktp: Optional[str] = None
    rt: Optional[RT] = None
    no_telepon: Optional[str] = None
    alamat: Optional[str] = None
    golongan: Optional[str] = None
    status_aktif: Optional[bool] = None


class PencatatanCreate(BaseModel):
    qr_code: str
    angka_meter_kini: float
    foto_meter: Optional[str] = None
    koordinat_gps: Optional[str] = None
    catatan: Optional[str] = ""


class BayarInput(BaseModel):
    metode_bayar: Literal["QRIS", "TUNAI", "TRANSFER"]
    nominal_bayar: float
    bukti_bayar: Optional[str] = None


class TarifInput(BaseModel):
    batas_bawah_m3: float = 0
    batas_atas_m3: Optional[float] = None
    harga_per_m3: float
    berlaku_mulai: Optional[str] = None  # ISO; default now


class PetugasCreate(BaseModel):
    nama: str
    username: str
    password: str
    role: Literal["PETUGAS", "ADMIN"] = "PETUGAS"


class PengaturanInput(BaseModel):
    nama_spab: Optional[str] = None
    alamat_spab: Optional[str] = None
    no_rekening: Optional[str] = None
    nama_bank: Optional[str] = None
    biaya_admin: Optional[float] = None
    qris_image: Optional[str] = None  # base64 data URL
    no_telepon_admin: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/login")
async def login(body: LoginInput):
    user = await db.users.find_one({"username": body.username.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    if not user.get("aktif", True):
        raise HTTPException(status_code=401, detail="Akun tidak aktif")
    token = create_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return ok({"token": token, "user": user}, "Login berhasil")


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return ok(user)


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return ok(None, "Logout berhasil")


# ---------------------------------------------------------------------------
# Pelanggan
# ---------------------------------------------------------------------------
async def _next_qr_code() -> str:
    year = datetime.now().year
    count = await db.pelanggan.count_documents({}) + 1
    return f"MTR-{year}-{count:04d}"


@api.get("/pelanggan")
async def list_pelanggan(rt: Optional[str] = None, q: Optional[str] = None,
                         user: dict = Depends(require_any)):
    flt = {}
    if rt:
        flt["rt"] = rt
    if q:
        flt["$or"] = [
            {"nama": {"$regex": q, "$options": "i"}},
            {"nomor_ktp": {"$regex": q, "$options": "i"}},
            {"qr_code": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.pelanggan.find(flt, {"_id": 0}).sort("nama", 1).to_list(5000)
    return ok(docs)


@api.post("/pelanggan")
async def create_pelanggan(body: PelangganCreate, user: dict = Depends(require_any)):
    if await db.pelanggan.find_one({"nomor_ktp": body.nomor_ktp}):
        raise HTTPException(400, "Nomor KTP sudah terdaftar")
    pid = str(uuid.uuid4())
    qr_code = await _next_qr_code()
    doc = body.model_dump()
    doc.update({
        "id": pid,
        "qr_code": qr_code,
        "angka_meter_terakhir": body.angka_awal,
        "status_aktif": True,
        "tanggal_daftar": iso(now_utc()),
        "tanggal_pasang": iso(now_utc()),
    })
    await db.pelanggan.insert_one(doc)
    doc.pop("_id", None)
    return ok(doc, "Pelanggan berhasil ditambahkan")


@api.get("/pelanggan/{pid}")
async def get_pelanggan(pid: str, user: dict = Depends(require_any)):
    doc = await db.pelanggan.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Pelanggan tidak ditemukan")
    histori = await db.pencatatan.find({"id_pelanggan": pid}, {"_id": 0}).sort("periode_bulan", -1).to_list(24)
    tagihan = await db.tagihan.find({"id_pelanggan": pid}, {"_id": 0}).sort("periode_bulan", -1).to_list(24)
    return ok({"pelanggan": doc, "pencatatan": histori, "tagihan": tagihan})


@api.put("/pelanggan/{pid}")
async def update_pelanggan(pid: str, body: PelangganUpdate, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Tidak ada data yang diubah")
    r = await db.pelanggan.update_one({"id": pid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Pelanggan tidak ditemukan")
    doc = await db.pelanggan.find_one({"id": pid}, {"_id": 0})
    return ok(doc, "Pelanggan diperbarui")


@api.get("/meteran/scan/{qr_code}")
async def scan_qr(qr_code: str, user: dict = Depends(require_any)):
    p = await db.pelanggan.find_one({"qr_code": qr_code}, {"_id": 0})
    if not p:
        raise HTTPException(404, "QR Code tidak dikenali")
    # tunggakan
    tunggakan = await db.tagihan.find(
        {"id_pelanggan": p["id"], "status_bayar": {"$in": ["BELUM", "SEBAGIAN"]}},
        {"_id": 0},
    ).sort("periode_bulan", 1).to_list(24)
    total_tunggakan = sum((t.get("sisa_tagihan", t["total_tagihan"])) for t in tunggakan)
    # last periode
    last = await db.pencatatan.find_one({"id_pelanggan": p["id"]}, {"_id": 0}, sort=[("periode_bulan", -1)])
    angka_lalu = last["angka_meter_kini"] if last else p.get("angka_awal", 0)
    return ok({
        "pelanggan": p,
        "angka_meter_lalu": angka_lalu,
        "periode_lalu": last["periode_bulan"] if last else None,
        "tunggakan_list": tunggakan,
        "total_tunggakan": total_tunggakan,
    })


# ---------------------------------------------------------------------------
# Tarif helpers
# ---------------------------------------------------------------------------
async def _tarif_aktif() -> float:
    t = await db.tarif.find_one({}, {"_id": 0}, sort=[("berlaku_mulai", -1)])
    return float(t["harga_per_m3"]) if t else 5000.0


async def _biaya_admin() -> float:
    s = await db.pengaturan.find_one({"id": "main"}, {"_id": 0}) or {}
    return float(s.get("biaya_admin", 5000))


# ---------------------------------------------------------------------------
# Pencatatan + auto-generate Tagihan
# ---------------------------------------------------------------------------
@api.post("/pencatatan")
async def create_pencatatan(body: PencatatanCreate, user: dict = Depends(require_any)):
    p = await db.pelanggan.find_one({"qr_code": body.qr_code}, {"_id": 0})
    if not p:
        raise HTTPException(404, "QR Code tidak dikenali")
    periode = iso(month_start(now_utc()))
    # cegah duplikat periode
    if await db.pencatatan.find_one({"id_pelanggan": p["id"], "periode_bulan": periode}):
        raise HTTPException(400, "Pelanggan ini sudah dicatat bulan ini")

    last = await db.pencatatan.find_one({"id_pelanggan": p["id"]}, {"_id": 0}, sort=[("periode_bulan", -1)])
    angka_lalu = last["angka_meter_kini"] if last else p.get("angka_awal", 0)
    if body.angka_meter_kini < angka_lalu:
        raise HTTPException(400, f"Angka meter kini ({body.angka_meter_kini}) < meter lalu ({angka_lalu})")

    pemakaian = round(float(body.angka_meter_kini) - float(angka_lalu), 2)

    # anomali: > 2x rata-rata 3 bln
    hist = await db.pencatatan.find(
        {"id_pelanggan": p["id"]}, {"_id": 0, "pemakaian_m3": 1}
    ).sort("periode_bulan", -1).to_list(3)
    is_anomali = False
    rata2 = 0.0
    if hist:
        rata2 = sum(float(h["pemakaian_m3"]) for h in hist) / len(hist)
        if rata2 > 0 and pemakaian > rata2 * 2:
            is_anomali = True

    cid = str(uuid.uuid4())
    catat_doc = {
        "id": cid,
        "id_pelanggan": p["id"],
        "id_petugas": user["id"],
        "qr_code": body.qr_code,
        "periode_bulan": periode,
        "angka_meter_lalu": angka_lalu,
        "angka_meter_kini": body.angka_meter_kini,
        "pemakaian_m3": pemakaian,
        "foto_meter": body.foto_meter,
        "koordinat_gps": body.koordinat_gps,
        "catatan": body.catatan or "",
        "is_anomali": is_anomali,
        "rata_rata_historis": round(rata2, 2),
        "waktu_catat": iso(now_utc()),
    }
    await db.pencatatan.insert_one(catat_doc)

    # update pelanggan meter terakhir
    await db.pelanggan.update_one(
        {"id": p["id"]}, {"$set": {"angka_meter_terakhir": body.angka_meter_kini}}
    )

    # generate tagihan
    tarif = await _tarif_aktif()
    biaya_admin = await _biaya_admin()
    biaya_air = round(pemakaian * tarif, 0)
    total = biaya_air + biaya_admin
    tid = str(uuid.uuid4())
    tag_doc = {
        "id": tid,
        "id_pencatatan": cid,
        "id_pelanggan": p["id"],
        "nama_pelanggan": p["nama"],
        "rt": p["rt"],
        "qr_code": body.qr_code,
        "nomor_tagihan": f"TAG-{datetime.now().strftime('%y%m')}-{p['qr_code'].split('-')[-1]}",
        "periode_bulan": periode,
        "pemakaian_m3": pemakaian,
        "tarif_per_m3": tarif,
        "biaya_air": biaya_air,
        "biaya_admin": biaya_admin,
        "total_tagihan": total,
        "sisa_tagihan": total,
        "status_bayar": "BELUM",
        "metode_bayar": None,
        "tanggal_bayar": None,
        "id_petugas_bayar": None,
        "bukti_bayar": None,
        "dibuat_pada": iso(now_utc()),
    }
    await db.tagihan.insert_one(tag_doc)
    catat_doc.pop("_id", None)
    tag_doc.pop("_id", None)
    return ok({"pencatatan": catat_doc, "tagihan": tag_doc, "is_anomali": is_anomali},
              "Pencatatan berhasil disimpan")


@api.get("/pencatatan")
async def list_pencatatan(periode: Optional[str] = None, rt: Optional[str] = None,
                          user: dict = Depends(require_any)):
    flt = {}
    if periode:
        flt["periode_bulan"] = periode
    if rt:
        ids = [x["id"] async for x in db.pelanggan.find({"rt": rt}, {"id": 1, "_id": 0})]
        flt["id_pelanggan"] = {"$in": ids}
    docs = await db.pencatatan.find(flt, {"_id": 0}).sort("waktu_catat", -1).to_list(5000)
    # enrich
    pmap = {p["id"]: p async for p in db.pelanggan.find({}, {"_id": 0})}
    for d in docs:
        p = pmap.get(d["id_pelanggan"], {})
        d["nama_pelanggan"] = p.get("nama", "-")
        d["rt"] = p.get("rt", "-")
    return ok(docs)


# ---------------------------------------------------------------------------
# Tagihan
# ---------------------------------------------------------------------------
@api.get("/tagihan")
async def list_tagihan(status: Optional[str] = None, rt: Optional[str] = None,
                       periode: Optional[str] = None, q: Optional[str] = None,
                       user: dict = Depends(require_any)):
    flt = {}
    if status:
        flt["status_bayar"] = status
    if rt:
        flt["rt"] = rt
    if periode:
        flt["periode_bulan"] = periode
    if q:
        flt["$or"] = [
            {"nama_pelanggan": {"$regex": q, "$options": "i"}},
            {"nomor_tagihan": {"$regex": q, "$options": "i"}},
            {"qr_code": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.tagihan.find(flt, {"_id": 0}).sort("periode_bulan", -1).to_list(5000)
    return ok(docs)


@api.get("/tagihan/{tid}")
async def get_tagihan(tid: str, user: dict = Depends(require_any)):
    t = await db.tagihan.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Tagihan tidak ditemukan")
    p = await db.pelanggan.find_one({"id": t["id_pelanggan"]}, {"_id": 0})
    s = await db.pengaturan.find_one({"id": "main"}, {"_id": 0}) or {}
    return ok({"tagihan": t, "pelanggan": p, "pengaturan": s})


@api.post("/tagihan/{tid}/bayar")
async def bayar_tagihan(tid: str, body: BayarInput, user: dict = Depends(require_any)):
    t = await db.tagihan.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Tagihan tidak ditemukan")
    if t["status_bayar"] == "LUNAS":
        raise HTTPException(400, "Tagihan sudah lunas")
    sisa = float(t.get("sisa_tagihan", t["total_tagihan"]))
    if body.nominal_bayar <= 0:
        raise HTTPException(400, "Nominal harus > 0")
    new_sisa = max(sisa - float(body.nominal_bayar), 0)
    status_bayar = "LUNAS" if new_sisa == 0 else "SEBAGIAN"
    upd = {
        "sisa_tagihan": new_sisa,
        "status_bayar": status_bayar,
        "metode_bayar": body.metode_bayar,
        "tanggal_bayar": iso(now_utc()) if status_bayar == "LUNAS" else t.get("tanggal_bayar"),
        "id_petugas_bayar": user["id"],
        "bukti_bayar": body.bukti_bayar or t.get("bukti_bayar"),
        "nominal_terbayar": (float(t.get("nominal_terbayar", 0)) + float(body.nominal_bayar)),
    }
    await db.tagihan.update_one({"id": tid}, {"$set": upd})
    t.update(upd)
    return ok(t, "Pembayaran berhasil dicatat")


# ---------------------------------------------------------------------------
# Dashboard / Tren
# ---------------------------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(require_any)):
    periode = iso(month_start(now_utc()))
    total_pel = await db.pelanggan.count_documents({"status_aktif": True})
    total_catat = await db.pencatatan.count_documents({"periode_bulan": periode})
    tagihan_bulan = await db.tagihan.find({"periode_bulan": periode}, {"_id": 0}).to_list(5000)
    total_tagihan = sum(float(x["total_tagihan"]) for x in tagihan_bulan)
    total_lunas = sum(float(x["total_tagihan"]) for x in tagihan_bulan if x["status_bayar"] == "LUNAS")
    belum = await db.tagihan.find(
        {"status_bayar": {"$in": ["BELUM", "SEBAGIAN"]}}, {"_id": 0}
    ).to_list(5000)
    tunggakan_total = sum(float(x.get("sisa_tagihan", x["total_tagihan"])) for x in belum)
    # per RT progress
    rt_stats = []
    for rt in ["RT01", "RT02", "RT03"]:
        total_rt = await db.pelanggan.count_documents({"rt": rt, "status_aktif": True})
        ids = [p["id"] async for p in db.pelanggan.find({"rt": rt}, {"id": 1, "_id": 0})]
        sudah = await db.pencatatan.count_documents({
            "periode_bulan": periode, "id_pelanggan": {"$in": ids}
        })
        anomali = await db.pencatatan.count_documents({
            "periode_bulan": periode, "id_pelanggan": {"$in": ids}, "is_anomali": True
        })
        rt_stats.append({
            "rt": rt, "total": total_rt, "sudah": sudah, "belum": total_rt - sudah, "anomali": anomali,
        })
    # aktivitas terbaru
    aktivitas = []
    for c in await db.pencatatan.find({}, {"_id": 0}).sort("waktu_catat", -1).to_list(10):
        p = await db.pelanggan.find_one({"id": c["id_pelanggan"]}, {"nama": 1, "rt": 1, "_id": 0})
        aktivitas.append({
            "tipe": "ANOMALI" if c.get("is_anomali") else "CATAT",
            "waktu": c["waktu_catat"],
            "deskripsi": f"{p.get('nama','-')} ({p.get('rt','-')}) tercatat {c['pemakaian_m3']} m³",
        })
    for t in await db.tagihan.find({"tanggal_bayar": {"$ne": None}}, {"_id": 0}).sort("tanggal_bayar", -1).to_list(10):
        aktivitas.append({
            "tipe": "BAYAR",
            "waktu": t["tanggal_bayar"],
            "deskripsi": f"{t['nama_pelanggan']} ({t['rt']}) lunas Rp {int(t['total_tagihan']):,}",
        })
    aktivitas.sort(key=lambda x: x["waktu"] or "", reverse=True)
    return ok({
        "total_pelanggan": total_pel,
        "total_pencatatan_bulan": total_catat,
        "total_tagihan_bulan": total_tagihan,
        "total_terkumpul_bulan": total_lunas,
        "total_tunggakan": tunggakan_total,
        "jumlah_belum_bayar": len(belum),
        "rt_stats": rt_stats,
        "aktivitas": aktivitas[:15],
    })


@api.get("/tren/pemakaian")
async def tren_pemakaian(rt: Optional[str] = None, bulan: int = 12,
                         user: dict = Depends(require_admin)):
    start = month_start(now_utc())
    labels = []
    for i in range(bulan - 1, -1, -1):
        d = add_months(start, -i)
        labels.append(iso(d))
    flt = {}
    ids = None
    if rt:
        ids = [p["id"] async for p in db.pelanggan.find({"rt": rt}, {"id": 1, "_id": 0})]
        flt["id_pelanggan"] = {"$in": ids}
    flt["periode_bulan"] = {"$in": labels}
    pencatatan = await db.pencatatan.find(flt, {"_id": 0}).to_list(10000)
    tagihan = await db.tagihan.find(flt, {"_id": 0}).to_list(10000)
    data = []
    for lab in labels:
        pem = sum(float(p["pemakaian_m3"]) for p in pencatatan if p["periode_bulan"] == lab)
        terbit = sum(float(t["total_tagihan"]) for t in tagihan if t["periode_bulan"] == lab)
        terkumpul = sum(float(t["total_tagihan"]) for t in tagihan
                        if t["periode_bulan"] == lab and t["status_bayar"] == "LUNAS")
        anomali = sum(1 for p in pencatatan if p["periode_bulan"] == lab and p.get("is_anomali"))
        data.append({
            "periode": lab,
            "label": datetime.fromisoformat(lab).strftime("%b %y"),
            "pemakaian_m3": round(pem, 2),
            "pendapatan_terbit": terbit,
            "pendapatan_terkumpul": terkumpul,
            "jumlah_anomali": anomali,
        })
    # distribusi golongan
    gol = {}
    for p in pencatatan:
        pel = await db.pelanggan.find_one({"id": p["id_pelanggan"]}, {"golongan": 1, "_id": 0})
        g = (pel or {}).get("golongan", "RUMAH_TANGGA")
        gol[g] = gol.get(g, 0) + float(p["pemakaian_m3"])
    distribusi = [{"golongan": k, "total_m3": round(v, 2)} for k, v in gol.items()]
    return ok({"data": data, "distribusi_golongan": distribusi})


@api.get("/tren/anomali")
async def tren_anomali(user: dict = Depends(require_admin)):
    docs = await db.pencatatan.find({"is_anomali": True}, {"_id": 0}).sort("waktu_catat", -1).to_list(200)
    out = []
    for d in docs:
        p = await db.pelanggan.find_one({"id": d["id_pelanggan"]}, {"_id": 0})
        if not p:
            continue
        rata = float(d.get("rata_rata_historis", 0) or 0)
        pem = float(d["pemakaian_m3"])
        selisih = ((pem - rata) / rata * 100) if rata > 0 else 0
        out.append({
            "id": d["id"],
            "nama": p["nama"],
            "rt": p["rt"],
            "periode": d["periode_bulan"],
            "pemakaian_m3": pem,
            "rata_rata": rata,
            "persen_selisih": round(selisih, 1),
        })
    return ok(out)


# ---------------------------------------------------------------------------
# Tarif
# ---------------------------------------------------------------------------
@api.get("/tarif")
async def list_tarif(user: dict = Depends(require_any)):
    docs = await db.tarif.find({}, {"_id": 0}).sort("berlaku_mulai", -1).to_list(100)
    return ok(docs)


@api.post("/tarif")
async def create_tarif(body: TarifInput, user: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["berlaku_mulai"] = body.berlaku_mulai or iso(now_utc())
    doc["dibuat_pada"] = iso(now_utc())
    await db.tarif.insert_one(doc)
    doc.pop("_id", None)
    return ok(doc, "Tarif berhasil ditambahkan")


# ---------------------------------------------------------------------------
# Petugas (user management)
# ---------------------------------------------------------------------------
@api.get("/petugas")
async def list_petugas(user: dict = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(200)
    return ok(docs)


@api.post("/petugas")
async def create_petugas(body: PetugasCreate, user: dict = Depends(require_admin)):
    if await db.users.find_one({"username": body.username.lower()}):
        raise HTTPException(400, "Username sudah dipakai")
    doc = {
        "id": str(uuid.uuid4()),
        "nama": body.nama,
        "username": body.username.lower(),
        "password_hash": hash_password(body.password),
        "role": body.role,
        "aktif": True,
        "dibuat_pada": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return ok(doc, "Petugas berhasil ditambahkan")


# ---------------------------------------------------------------------------
# Pengaturan
# ---------------------------------------------------------------------------
@api.get("/pengaturan")
async def get_pengaturan(user: dict = Depends(require_any)):
    s = await db.pengaturan.find_one({"id": "main"}, {"_id": 0}) or {}
    return ok(s)


@api.put("/pengaturan")
async def update_pengaturan(body: PengaturanInput, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.pengaturan.update_one({"id": "main"}, {"$set": upd}, upsert=True)
    s = await db.pengaturan.find_one({"id": "main"}, {"_id": 0})
    return ok(s, "Pengaturan disimpan")


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
async def seed():
    # users
    admin_user = os.environ.get("ADMIN_USERNAME", "admin").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    petugas_user = os.environ.get("PETUGAS_USERNAME", "petugas").lower()
    petugas_pw = os.environ.get("PETUGAS_PASSWORD", "petugas123")

    if not await db.users.find_one({"username": admin_user}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "nama": "Administrator",
            "username": admin_user,
            "password_hash": hash_password(admin_pw),
            "role": "ADMIN",
            "aktif": True,
            "dibuat_pada": iso(now_utc()),
        })
    if not await db.users.find_one({"username": petugas_user}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "nama": "Pak Budi",
            "username": petugas_user,
            "password_hash": hash_password(petugas_pw),
            "role": "PETUGAS",
            "aktif": True,
            "dibuat_pada": iso(now_utc()),
        })

    # tarif default
    if await db.tarif.count_documents({}) == 0:
        await db.tarif.insert_one({
            "id": str(uuid.uuid4()),
            "batas_bawah_m3": 0,
            "batas_atas_m3": None,
            "harga_per_m3": 4000,
            "berlaku_mulai": iso(now_utc() - timedelta(days=90)),
            "dibuat_pada": iso(now_utc() - timedelta(days=90)),
        })

    # pengaturan default
    if not await db.pengaturan.find_one({"id": "main"}):
        await db.pengaturan.insert_one({
            "id": "main",
            "nama_spab": "SPAB KRL Ragam Berseri",
            "alamat_spab": "Perumahan KRL Ragam Berseri, RT 01-03",
            "no_rekening": "1234-5678-9012",
            "nama_bank": "Bank BRI",
            "biaya_admin": 5000,
            "qris_image": None,
            "no_telepon_admin": "6281234567890",
        })

    # sample pelanggan
    if await db.pelanggan.count_documents({}) == 0:
        petugas = await db.users.find_one({"username": petugas_user}, {"_id": 0})
        nama_list = [
            ("Rina Marlina", "RT01", "081234567801"),
            ("Budi Santoso", "RT01", "081234567802"),
            ("Siti Aminah", "RT01", "081234567803"),
            ("Ahmad Hidayat", "RT02", "081234567804"),
            ("Dewi Kurnia", "RT02", "081234567805"),
            ("Joko Susilo", "RT02", "081234567806"),
            ("Linda Wijaya", "RT02", "081234567807"),
            ("Hendra Gunawan", "RT03", "081234567808"),
            ("Maya Sari", "RT03", "081234567809"),
            ("Agus Prasetyo", "RT03", "081234567810"),
        ]
        pelanggan_ids = []
        for i, (nama, rt, tel) in enumerate(nama_list, start=1):
            year = datetime.now().year
            qr = f"MTR-{year}-{i:04d}"
            pid = str(uuid.uuid4())
            doc = {
                "id": pid,
                "nama": nama,
                "nomor_ktp": f"32010101010100{i:02d}",
                "rt": rt,
                "no_telepon": tel,
                "alamat": f"Blok {rt[-1]} No. {i}",
                "golongan": "USAHA" if i % 7 == 0 else ("SOSIAL" if i % 9 == 0 else "RUMAH_TANGGA"),
                "qr_code": qr,
                "no_seri_meter": f"ST-{1000+i}",
                "angka_awal": 100.0 + i,
                "angka_meter_terakhir": 100.0 + i,
                "foto_lokasi": None,
                "status_aktif": True,
                "tanggal_daftar": iso(now_utc() - timedelta(days=120)),
                "tanggal_pasang": iso(now_utc() - timedelta(days=120)),
            }
            await db.pelanggan.insert_one(doc)
            pelanggan_ids.append(doc)

        # seed pencatatan 3 bulan lalu
        tarif = 4000
        biaya_admin = 5000
        now = now_utc()
        for back in [3, 2, 1]:
            periode = iso(add_months(month_start(now), -back))
            for idx, p in enumerate(pelanggan_ids):
                pemakaian = round(4 + (idx % 5) + (0.5 * back), 1)
                # simulasi satu anomali
                if idx == 4 and back == 1:
                    pemakaian = 22.0
                angka_lalu = float(p["angka_meter_terakhir"])
                angka_kini = round(angka_lalu + pemakaian, 1)
                p["angka_meter_terakhir"] = angka_kini
                cid = str(uuid.uuid4())
                hist = await db.pencatatan.find(
                    {"id_pelanggan": p["id"]}, {"pemakaian_m3": 1, "_id": 0}
                ).sort("periode_bulan", -1).to_list(3)
                rata = sum(float(h["pemakaian_m3"]) for h in hist) / len(hist) if hist else 0
                is_anom = rata > 0 and pemakaian > rata * 2
                await db.pencatatan.insert_one({
                    "id": cid,
                    "id_pelanggan": p["id"],
                    "id_petugas": petugas["id"],
                    "qr_code": p["qr_code"],
                    "periode_bulan": periode,
                    "angka_meter_lalu": angka_lalu,
                    "angka_meter_kini": angka_kini,
                    "pemakaian_m3": pemakaian,
                    "foto_meter": None,
                    "koordinat_gps": None,
                    "catatan": "",
                    "is_anomali": is_anom,
                    "rata_rata_historis": round(rata, 2),
                    "waktu_catat": periode,
                })
                await db.pelanggan.update_one(
                    {"id": p["id"]}, {"$set": {"angka_meter_terakhir": angka_kini}}
                )
                biaya_air = round(pemakaian * tarif, 0)
                total = biaya_air + biaya_admin
                # last month belum bayar sebagian; older: lunas
                status_bayar = "LUNAS" if back >= 2 else ("BELUM" if idx % 3 == 0 else "LUNAS")
                sisa = 0 if status_bayar == "LUNAS" else total
                await db.tagihan.insert_one({
                    "id": str(uuid.uuid4()),
                    "id_pencatatan": cid,
                    "id_pelanggan": p["id"],
                    "nama_pelanggan": p["nama"],
                    "rt": p["rt"],
                    "qr_code": p["qr_code"],
                    "nomor_tagihan": f"TAG-{datetime.fromisoformat(periode).strftime('%y%m')}-{p['qr_code'].split('-')[-1]}",
                    "periode_bulan": periode,
                    "pemakaian_m3": pemakaian,
                    "tarif_per_m3": tarif,
                    "biaya_air": biaya_air,
                    "biaya_admin": biaya_admin,
                    "total_tagihan": total,
                    "sisa_tagihan": sisa,
                    "nominal_terbayar": total - sisa,
                    "status_bayar": status_bayar,
                    "metode_bayar": "QRIS" if status_bayar == "LUNAS" else None,
                    "tanggal_bayar": periode if status_bayar == "LUNAS" else None,
                    "id_petugas_bayar": petugas["id"] if status_bayar == "LUNAS" else None,
                    "bukti_bayar": None,
                    "dibuat_pada": periode,
                })


# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spab")


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("username", unique=True)
        await db.pelanggan.create_index("qr_code", unique=True)
        await db.pelanggan.create_index("nomor_ktp", unique=True)
        await db.pencatatan.create_index([("id_pelanggan", 1), ("periode_bulan", 1)])
        await db.tagihan.create_index([("id_pelanggan", 1), ("periode_bulan", 1)])
        await seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.exception("Startup error: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return ok({"name": "SPAB KRL Ragam Berseri API", "version": "1.0"})
