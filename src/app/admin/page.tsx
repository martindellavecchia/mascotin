'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isBlocked: boolean;
    image: string | null;
    createdAt: string;
    _count: { posts: number };
    owner?: { id: string; _count: { pets: number } };
    providerProfile?: { id: string; businessName: string };
}

interface Provider {
    id: string;
    businessName: string;
    location: string;
    rating: number;
    reviewCount: number;
    isActive?: boolean;
    createdAt: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        image: string | null;
    };
    _count: { services: number; appointments: number };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionOpen, setActionOpen] = useState(false);
    const [actionType, setActionType] = useState<'role' | 'block' | 'password' | 'delete'>('role');
    const [newRole, setNewRole] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });
            if (search) params.set('search', search);
            if (roleFilter && roleFilter !== 'ALL') params.set('role', roleFilter);

            const res = await fetch(`/api/admin/users?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setUsers(data.users);
                setPagination(data.pagination);
            } else if (res.status === 403) {
                router.push('/');
                toast.error('Acceso denegado');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, search, roleFilter, router]);

    const fetchProviders = useCallback(async () => {
        try {
            setLoadingProviders(true);
            const res = await fetch('/api/admin/providers');
            const data = await res.json();
            if (data.success) {
                setProviders(data.providers);
            }
        } catch (error) {
            console.error('Error fetching providers:', error);
        } finally {
            setLoadingProviders(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchUsers();
            fetchProviders();
        }
    }, [status, fetchUsers, router]);

    const openAction = (user: User, type: 'role' | 'block' | 'password' | 'delete') => {
        setSelectedUser(user);
        setActionType(type);
        setNewRole(user.role);
        setTempPassword('');
        setActionOpen(true);
    };

    const handleAction = async () => {
        if (!selectedUser) return;
        setProcessing(true);

        try {
            if (actionType === 'role') {
                const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: newRole }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success('Rol actualizado');
                    fetchUsers();
                } else {
                    toast.error(data.error);
                }
            } else if (actionType === 'block') {
                const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isBlocked: !selectedUser.isBlocked }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success(selectedUser.isBlocked ? 'Usuario desbloqueado' : 'Usuario bloqueado');
                    fetchUsers();
                } else {
                    toast.error(data.error);
                }
            } else if (actionType === 'password') {
                const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
                    method: 'POST',
                });
                const data = await res.json();
                if (data.success) {
                    setTempPassword(data.tempPassword);
                    toast.success('Contraseña reseteada');
                } else {
                    toast.error(data.error);
                }
            } else if (actionType === 'delete') {
                const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                    method: 'DELETE',
                });
                const data = await res.json();
                if (data.success) {
                    toast.success('Usuario eliminado');
                    setActionOpen(false);
                    fetchUsers();
                } else {
                    toast.error(data.error);
                }
            }
        } catch (error) {
            toast.error('Error al procesar');
        } finally {
            setProcessing(false);
            if (actionType !== 'password') {
                setActionOpen(false);
            }
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return <Badge className="bg-purple-100 text-purple-700">Admin</Badge>;
            case 'PROVIDER':
                return <Badge className="bg-teal-100 text-teal-700">Proveedor</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-700">Usuario</Badge>;
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Header session={session} />
                <div className="container mx-auto px-4 py-8 flex justify-center">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Header session={session} />
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-symbols-rounded text-purple-500">admin_panel_settings</span>
                            Panel de Administración
                        </h1>
                        <p className="text-slate-500">Gestiona usuarios, roles y proveedores</p>
                    </div>
                </div>

                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="users">Usuarios</TabsTrigger>
                        <TabsTrigger value="providers">Proveedores</TabsTrigger>
                        <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        {/* Filters */}
                        <Card className="mb-4">
                            <CardContent className="p-4">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <Input
                                            placeholder="Buscar por nombre o email..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                        />
                                    </div>
                                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Todos los roles" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Todos</SelectItem>
                                            <SelectItem value="OWNER">Usuario</SelectItem>
                                            <SelectItem value="PROVIDER">Proveedor</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={fetchUsers} variant="outline">
                                        <span className="material-symbols-rounded mr-2">search</span>
                                        Buscar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Users Table */}
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="text-left p-4 font-medium text-slate-600">Usuario</th>
                                                <th className="text-left p-4 font-medium text-slate-600">Rol</th>
                                                <th className="text-left p-4 font-medium text-slate-600">Estado</th>
                                                <th className="text-left p-4 font-medium text-slate-600">Info</th>
                                                <th className="text-right p-4 font-medium text-slate-600">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b hover:bg-slate-50">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10">
                                                                {user.image ? (
                                                                    <AvatarImage src={user.image} />
                                                                ) : (
                                                                    <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                                                                )}
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium text-slate-800">{user.name || 'Sin nombre'}</p>
                                                                <p className="text-sm text-slate-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">{getRoleBadge(user.role)}</td>
                                                    <td className="p-4">
                                                        {user.isBlocked ? (
                                                            <Badge className="bg-red-100 text-red-700">Bloqueado</Badge>
                                                        ) : (
                                                            <Badge className="bg-green-100 text-green-700">Activo</Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-500">
                                                        {user.owner && <span>{user.owner._count.pets} mascotas</span>}
                                                        {user.providerProfile && <span>{user.providerProfile.businessName}</span>}
                                                        {!user.owner && !user.providerProfile && <span>-</span>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <span className="material-symbols-rounded">more_vert</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openAction(user, 'role')}>
                                                                    <span className="material-symbols-rounded mr-2 text-slate-500">badge</span>
                                                                    Cambiar Rol
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openAction(user, 'block')}>
                                                                    <span className="material-symbols-rounded mr-2 text-slate-500">
                                                                        {user.isBlocked ? 'lock_open' : 'block'}
                                                                    </span>
                                                                    {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openAction(user, 'password')}>
                                                                    <span className="material-symbols-rounded mr-2 text-slate-500">key</span>
                                                                    Resetear Contraseña
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => openAction(user, 'delete')}
                                                                    className="text-red-600"
                                                                >
                                                                    <span className="material-symbols-rounded mr-2">delete</span>
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="p-4 border-t flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        Mostrando {users.length} de {pagination.total} usuarios
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page <= 1}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page >= pagination.totalPages}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stats">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <span className="material-symbols-rounded text-4xl text-slate-400 mb-2">group</span>
                                    <p className="text-3xl font-bold text-slate-800">{pagination.total}</p>
                                    <p className="text-slate-500">Usuarios Totales</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <span className="material-symbols-rounded text-4xl text-teal-400 mb-2">storefront</span>
                                    <p className="text-3xl font-bold text-slate-800">
                                        {users.filter(u => u.role === 'PROVIDER').length}
                                    </p>
                                    <p className="text-slate-500">Proveedores</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <span className="material-symbols-rounded text-4xl text-purple-400 mb-2">shield_person</span>
                                    <p className="text-3xl font-bold text-slate-800">
                                        {users.filter(u => u.role === 'ADMIN').length}
                                    </p>
                                    <p className="text-slate-500">Administradores</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="providers">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Proveedores Registrados</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingProviders ? (
                                    <div className="p-8 text-center">
                                        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : providers.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <span className="material-symbols-rounded text-4xl mb-2">storefront</span>
                                        <p>No hay proveedores registrados</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="text-left p-4 font-medium text-slate-600">Negocio</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Ubicación</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Rating</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Servicios</th>
                                                    <th className="text-right p-4 font-medium text-slate-600">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {providers.map((provider) => (
                                                    <tr key={provider.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-10 w-10">
                                                                    {provider.user.image ? (
                                                                        <AvatarImage src={provider.user.image} />
                                                                    ) : (
                                                                        <AvatarFallback>{provider.businessName[0]}</AvatarFallback>
                                                                    )}
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium text-slate-800">{provider.businessName}</p>
                                                                    <p className="text-sm text-slate-500">{provider.user.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-slate-600">{provider.location}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-rounded text-amber-400 text-sm filled">star</span>
                                                                <span className="font-medium">{provider.rating?.toFixed(1) || 'N/A'}</span>
                                                                <span className="text-slate-400 text-sm">({provider.reviewCount || 0})</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge className="bg-teal-100 text-teal-700">{provider._count.services} servicios</Badge>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:bg-red-50"
                                                                onClick={async () => {
                                                                    if (confirm('¿Eliminar este proveedor?')) {
                                                                        const res = await fetch(`/api/admin/providers/${provider.id}`, { method: 'DELETE' });
                                                                        const data = await res.json();
                                                                        if (data.success) {
                                                                            toast.success('Proveedor eliminado');
                                                                            fetchProviders();
                                                                        } else {
                                                                            toast.error(data.error);
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <span className="material-symbols-rounded">delete</span>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Action Dialog */}
            <Dialog open={actionOpen} onOpenChange={setActionOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'role' && 'Cambiar Rol'}
                            {actionType === 'block' && (selectedUser?.isBlocked ? 'Desbloquear Usuario' : 'Bloquear Usuario')}
                            {actionType === 'password' && 'Resetear Contraseña'}
                            {actionType === 'delete' && 'Eliminar Usuario'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {actionType === 'role' && (
                            <div>
                                <p className="text-sm text-slate-500 mb-3">
                                    Cambiar rol de <strong>{selectedUser?.name || selectedUser?.email}</strong>
                                </p>
                                <Select value={newRole} onValueChange={setNewRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OWNER">Usuario</SelectItem>
                                        <SelectItem value="PROVIDER">Proveedor</SelectItem>
                                        <SelectItem value="ADMIN">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {actionType === 'block' && (
                            <p className="text-slate-600">
                                ¿Estás seguro de {selectedUser?.isBlocked ? 'desbloquear' : 'bloquear'} a{' '}
                                <strong>{selectedUser?.name || selectedUser?.email}</strong>?
                            </p>
                        )}

                        {actionType === 'password' && (
                            <div>
                                {tempPassword ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <p className="text-sm text-amber-700 mb-2">Contraseña temporal generada:</p>
                                        <code className="bg-amber-100 px-3 py-2 rounded font-mono text-lg block text-center">
                                            {tempPassword}
                                        </code>
                                        <p className="text-xs text-amber-600 mt-2">
                                            Comparte esta contraseña con el usuario. Deberá cambiarla al iniciar sesión.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-slate-600">
                                        ¿Generar nueva contraseña para <strong>{selectedUser?.name || selectedUser?.email}</strong>?
                                    </p>
                                )}
                            </div>
                        )}

                        {actionType === 'delete' && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700">
                                    ⚠️ Esta acción es irreversible. Se eliminarán todos los datos asociados a este usuario.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionOpen(false)}>
                            {tempPassword ? 'Cerrar' : 'Cancelar'}
                        </Button>
                        {!tempPassword && (
                            <Button
                                onClick={handleAction}
                                disabled={processing}
                                className={actionType === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'}
                            >
                                {processing ? 'Procesando...' : 'Confirmar'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
