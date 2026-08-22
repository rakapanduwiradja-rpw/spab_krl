import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Droplets, Loader2, User, Lock } from "lucide-react";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [u, setU] = useState("");
    const [p, setP] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const user = await login(u.trim(), p);
            nav(user.role === "ADMIN" ? "/admin" : "/petugas");
        } catch (ex) {
            setErr(formatApiError(ex));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:flex bg-[hsl(var(--sidebar))] text-white p-12 relative overflow-hidden">
                <div className="relative z-10 flex flex-col justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center">
                            <Droplets className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-semibold text-lg">
                                SPAB KRL
                            </div>
                            <div className="text-slate-400 text-sm">
                                Ragam Berseri
                            </div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-semibold leading-tight mb-4">
                            Sistem Pencatatan &<br />
                            Penagihan Air
                        </h1>
                        <p className="text-slate-400 max-w-md text-[15px]">
                            Kelola pelanggan, catat meteran, dan terima
                            pembayaran dalam satu platform modern untuk SPAB KRL
                            Ragam Berseri.
                        </p>
                    </div>
                    <div className="text-xs text-slate-500 flex gap-6">
                        <span>RT 01 · RT 02 · RT 03</span>
                    </div>
                </div>
                <div className="absolute -right-32 -bottom-32 w-[520px] h-[520px] rounded-full bg-[hsl(var(--primary))] opacity-15 blur-3xl"></div>
                <div className="absolute right-20 top-32 w-[360px] h-[360px] rounded-full bg-[hsl(var(--accent))] opacity-10 blur-3xl"></div>
            </div>

            <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
                <form
                    onSubmit={submit}
                    className="w-full max-w-sm"
                    data-testid="login-form"
                >
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold">SPAB KRL</div>
                            <div className="text-slate-500 text-xs">
                                Ragam Berseri
                            </div>
                        </div>
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Masuk</h2>
                    <p className="text-slate-500 mb-8 text-sm">
                        Silakan login dengan akun petugas atau admin Anda.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <Label>Username</Label>
                            <div className="relative mt-1.5">
                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={u}
                                    onChange={(e) => setU(e.target.value)}
                                    className="pl-9"
                                    placeholder="Masukkan username"
                                    required
                                    data-testid="login-username-input"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Password</Label>
                            <div className="relative mt-1.5">
                                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="password"
                                    value={p}
                                    onChange={(e) => setP(e.target.value)}
                                    className="pl-9"
                                    placeholder="••••••••"
                                    required
                                    data-testid="login-password-input"
                                />
                            </div>
                        </div>
                    </div>

                    {err && (
                        <div
                            className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                            data-testid="login-error"
                        >
                            {err}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full mt-6 h-11"
                        disabled={loading}
                        data-testid="login-submit-button"
                    >
                        {loading && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Masuk
                    </Button>
                </form>
            </div>
        </div>
    );
}