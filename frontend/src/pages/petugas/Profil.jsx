import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { LogOut, User } from "lucide-react";

export default function Profil() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    return (
        <div data-testid="profil-page">
            <header className="px-5 py-5 bg-[hsl(var(--sidebar))] text-white">
                <div className="font-semibold text-lg">Profil</div>
            </header>
            <div className="p-5 space-y-4">
                <Card className="p-5 border-slate-200 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center">
                        <User className="w-7 h-7" />
                    </div>
                    <div className="mt-3 font-semibold text-lg">
                        {user?.nama}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                        @{user?.username}
                    </div>
                    <Badge className="mt-3 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                        {user?.role}
                    </Badge>
                </Card>
                <Card className="p-4 border-slate-200 text-sm text-slate-500">
                    <div className="flex justify-between">
                        <span>Versi aplikasi</span>
                        <span className="font-mono">1.0.0</span>
                    </div>
                </Card>
                <Button
                    variant="outline"
                    onClick={() => {
                        logout();
                        nav("/login");
                    }}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    data-testid="btn-logout-petugas"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar
                </Button>
            </div>
        </div>
    );
}
