import { useEffect, useState } from "react";
import api, { formatApiError } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export default function Petugas() {
    const [items, setItems] = useState([]);
    const [f, setF] = useState({
        nama: "",
        username: "",
        password: "",
        role: "PETUGAS",
    });

    const load = () =>
        api.get("/petugas_list").then((r) => setItems(r.data.data));
    useEffect(() => {
        load();
    }, []);

    const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

    const simpan = async () => {
        try {
            await api.post("/petugas_create", f);
            toast.success("Akun dibuat");
            setF({ nama: "", username: "", password: "", role: "PETUGAS" });
            load();
        } catch (ex) {
            toast.error(formatApiError(ex));
        }
    };

    return (
        <div className="space-y-6" data-testid="petugas-page">
            <div>
                <h1 className="text-2xl font-semibold">Manajemen Akun</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Tambah akun petugas atau admin lain.
                </p>
            </div>

            <Card className="p-5 border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                    <Label>Nama</Label>
                    <Input
                        className="mt-1.5"
                        value={f.nama}
                        onChange={(e) => set("nama")(e.target.value)}
                        data-testid="form-petugas-nama"
                    />
                </div>
                <div>
                    <Label>Username</Label>
                    <Input
                        className="mt-1.5"
                        value={f.username}
                        onChange={(e) => set("username")(e.target.value)}
                        data-testid="form-petugas-username"
                    />
                </div>
                <div>
                    <Label>Password</Label>
                    <Input
                        type="password"
                        className="mt-1.5"
                        value={f.password}
                        onChange={(e) => set("password")(e.target.value)}
                        data-testid="form-petugas-password"
                    />
                </div>
                <div>
                    <Label>Role</Label>
                    <Select value={f.role} onValueChange={set("role")}>
                        <SelectTrigger className="mt-1.5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PETUGAS">Petugas</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={simpan}
                    className="bg-[hsl(var(--primary))]"
                    data-testid="btn-tambah-petugas"
                >
                    <UserPlus className="w-4 h-4 mr-1.5" /> Tambah
                </Button>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="py-3 px-4 text-left font-medium">
                                Nama
                            </th>
                            <th className="py-3 px-4 text-left font-medium">
                                Username
                            </th>
                            <th className="py-3 px-4 text-left font-medium">
                                Role
                            </th>
                            <th className="py-3 px-4 text-left font-medium">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((u) => (
                            <tr key={u.id} className="border-t border-slate-100">
                                <td className="py-3 px-4 font-medium">
                                    {u.nama}
                                </td>
                                <td className="py-3 px-4 font-mono text-xs">
                                    {u.username}
                                </td>
                                <td className="py-3 px-4">
                                    <Badge
                                        className={
                                            u.role === "ADMIN"
                                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                        }
                                    >
                                        {u.role}
                                    </Badge>
                                </td>
                                <td className="py-3 px-4">
                                    {u.aktif ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                            Aktif
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Non-aktif</Badge>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
