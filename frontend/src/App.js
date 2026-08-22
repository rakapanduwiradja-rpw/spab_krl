import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import PetugasLayout from "./components/PetugasLayout";
import { Toaster } from "./components/ui/sonner";
import { BluetoothPrinterProvider } from "./lib/BluetoothPrinterContext";

import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import PelangganList from "./pages/admin/Pelanggan";
import PelangganDetail from "./pages/admin/PelangganDetail";
import PelangganForm from "./pages/admin/PelangganForm";
import Pencatatan from "./pages/admin/Pencatatan";
import Tagihan from "./pages/admin/Tagihan";
import Tren from "./pages/admin/Tren";
import Tarif from "./pages/admin/Tarif";
import Nota, { AdminNotaDetail } from "./pages/admin/Nota";
import Pengaturan from "./pages/admin/Pengaturan";
import Petugas from "./pages/admin/Petugas";
import PrintQRMassal from "./pages/admin/PrintQRMassal";

import Beranda from "./pages/petugas/Beranda";
import Scan from "./pages/petugas/Scan";
import Catat from "./pages/petugas/Catat";
import Bayar from "./pages/petugas/Bayar";
import BayarCari from "./pages/petugas/BayarCari";
import NotaPetugas, { PetugasNotaList } from "./pages/petugas/NotaPetugas";
import TambahPelanggan from "./pages/petugas/TambahPelanggan";
import Riwayat from "./pages/petugas/Riwayat";
import Profil from "./pages/petugas/Profil";

function RootRedirect() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return (
        <Navigate to={user.role === "ADMIN" ? "/admin" : "/petugas"} replace />
    );
}

function App() {
    return (
        <AuthProvider>
            <BluetoothPrinterProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute role="ADMIN">
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="pelanggan" element={<PelangganList />} />
                        <Route path="pelanggan/tambah" element={<PelangganForm />} />
                        <Route path="pelanggan/:id" element={<PelangganDetail />} />
                        <Route path="pencatatan" element={<Pencatatan />} />
                        <Route path="tagihan" element={<Tagihan />} />
                        <Route path="tren" element={<Tren />} />
                        <Route path="tarif" element={<Tarif />} />
                        <Route path="nota" element={<Nota />} />
                        <Route path="nota/:id" element={<AdminNotaDetail />} />
                        <Route path="pengaturan" element={<Pengaturan />} />
                        <Route path="petugas" element={<Petugas />} />
                        <Route path="print-qr" element={<PrintQRMassal />} />
                    </Route>

                    <Route
                        path="/petugas"
                        element={
                            <ProtectedRoute>
                                <PetugasLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Beranda />} />
                        <Route path="scan" element={<Scan />} />
                        <Route path="catat/:qr" element={<Catat />} />
                        <Route path="bayar-cari" element={<BayarCari />} />
                        <Route path="bayar/:id" element={<Bayar />} />
                        <Route path="nota" element={<PetugasNotaList />} />
                        <Route path="nota/:id" element={<NotaPetugas />} />
                        <Route path="tambah-pelanggan" element={<TambahPelanggan />} />
                        <Route path="riwayat" element={<Riwayat />} />
                        <Route path="profil" element={<Profil />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster position="top-center" richColors />
            </BrowserRouter>
            </BluetoothPrinterProvider>
        </AuthProvider>
    );
}

export default App;
