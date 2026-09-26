'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Ban,
    IdCard,
    Inbox,
    Key,
    LockOpen,
    MoreVertical,
    Search,
    ShieldUser,
    Star,
    Store,
    Trash2,
    Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
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

interface ProviderRequestItem {
    id: string;
    businessName: string;
    description: string | null;
    location: string;
    reason: string;
    status: string;
    adminNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        role: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface UserStats {
    totalUsers: number;
    byRole: { OWNER: number; PROVIDER: number; ADMIN: number };
}

const PROVIDERS_PAGE_SIZE = 20;

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [providersError, setProvidersError] = useState(false);
    const [providerSearch, setProviderSearch] = useState('');
    const [debouncedProviderSearch, setDebouncedProviderSearch] = useState('');
    const [providerPagination, setProviderPagination] = useState<Pagination>({
        page: 1,
        limit: PROVIDERS_PAGE_SIZE,
        total: 0,
        totalPages: 0,
    });
    const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
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

    // Provider requests state
    const [providerRequests, setProviderRequests] = useState<ProviderRequestItem[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [requestsError, setRequestsError] = useState(false);
    const [requestCounts, setRequestCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
    const [requestFilter, setRequestFilter] = useState('PENDING');
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ProviderRequestItem | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [reviewProcessing, setReviewProcessing] = useState(false);

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
                if (data.stats) setUserStats(data.stats);
            } else if (res.status === 403) {
                router.push('/inicio');
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
            setProvidersError(false);
            const params = new URLSearchParams({
                page: providerPagination.page.toString(),
                limit: PROVIDERS_PAGE_SIZE.toString(),
            });
            if (debouncedProviderSearch) params.set('search', debouncedProviderSearch);
            const res = await fetch(`/api/admin/providers?${params.toString()}`);
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);
            setProviders(data.providers);
            setProviderPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching providers:', error);
            setProvidersError(true);
            toast.error('No pudimos cargar los proveedores');
        } finally {
            setLoadingProviders(false);
        }
    }, [providerPagination.page, debouncedProviderSearch]);

    const fetchProviderRequests = useCallback(async () => {
        try {
            setLoadingRequests(true);
            setRequestsError(false);
            const params = new URLSearchParams();
            if (requestFilter) params.set('status', requestFilter);
            const res = await fetch(`/api/admin/provider-requests?${params.toString()}`);
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error);
            setProviderRequests(data.requests);
            setRequestCounts(data.counts);
        } catch (error) {
            console.error('Error fetching provider requests:', error);
            setRequestsError(true);
            toast.error('No pudimos cargar las solicitudes de proveedor');
        } finally {
            setLoadingRequests(false);
        }
    }, [requestFilter]);

    const deleteProvider = async (provider: Provider) => {
        try {
            const res = await fetch(`/api/admin/providers/${provider.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) {
                toast.error(data.error || 'No pudimos eliminar el proveedor');
                return false;
            }
            toast.success('Proveedor eliminado');
            void fetchProviders();
            return true;
        } catch (error) {
            console.error('Error deleting provider:', error);
            toast.error('No pudimos eliminar el proveedor');
            return false;
        }
    };

    const handleReviewRequest = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedRequest) return;
        setReviewProcessing(true);
        try {
            const res = await fetch(`/api/admin/provider-requests/${selectedRequest.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminNote }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(status === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada');
                setReviewDialogOpen(false);
                setAdminNote('');
                fetchProviderRequests();
                if (status === 'APPROVED') fetchProviders();
            } else {
                toast.error(data.error || 'Error al procesar');
            }
        } catch (error) {
            toast.error('Error al procesar');
        } finally {
            setReviewProcessing(false);
        }
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchUsers();
        }
    }, [status, fetchUsers, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProviders();
        }
    }, [status, fetchProviders]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProviderRequests();
        }
    }, [requestFilter, fetchProviderRequests, status]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedProviderSearch(providerSearch.trim());
            setProviderPagination(p => (p.page === 1 ? p : { ...p, page: 1 }));
        }, 300);
        return () => window.clearTimeout(timer);
    }, [providerSearch]);

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
                return <Badge className="bg-teal-50 text-teal-800">Admin</Badge>;
            case 'PROVIDER':
                return <Badge className="bg-teal-100 text-teal-700">Proveedor</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-700">Usuario</Badge>;
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto flex max-w-7xl justify-center px-4 py-8">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <PageHeader title="Panel de administración" description="Gestioná usuarios, roles, proveedores y solicitudes." />

                <Tabs defaultValue="users" className="mt-6 w-full">
                    <div className="mb-3 overflow-x-auto pb-1">
                        <TabsList className="h-auto w-max min-w-full justify-start">
                            <TabsTrigger className="min-h-10 shrink-0" value="users">Usuarios</TabsTrigger>
                            <TabsTrigger className="min-h-10 shrink-0" value="providers">Proveedores</TabsTrigger>
                            <TabsTrigger value="requests" className="relative min-h-10 shrink-0">
                                Solicitudes
                                {requestCounts.PENDING > 0 && (
                                    <span className="ml-1.5 min-w-[20px] rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-xs text-white">
                                        {requestCounts.PENDING}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger className="min-h-10 shrink-0" value="stats">Estadísticas</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="users">
                        {/* Filters */}
                        <Card className="mb-4">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                                    <div className="min-w-0 flex-1 sm:min-w-[200px]">
                                        <Input
                                            placeholder="Buscar por nombre o email..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                        />
                                    </div>
                                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                                        <SelectTrigger className="w-full sm:w-[150px]">
                                            <SelectValue placeholder="Todos los roles" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Todos</SelectItem>
                                            <SelectItem value="OWNER">Usuario</SelectItem>
                                            <SelectItem value="PROVIDER">Proveedor</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button className="w-full sm:w-auto" onClick={fetchUsers} variant="outline">
                                        <Search className="mr-2 size-5" aria-hidden="true" />
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
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-slate-800">{user.name || 'Sin nombre'}</p>
                                                                <p className="break-words text-sm text-slate-500 [overflow-wrap:anywhere]">{user.email}</p>
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
                                                                <Button variant="ghost" size="icon" aria-label="Más opciones">
                                                                    <MoreVertical className="size-5" aria-hidden="true" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openAction(user, 'role')}>
                                                                    <IdCard className="mr-2 size-5 text-slate-500" aria-hidden="true" />
                                                                    Cambiar Rol
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openAction(user, 'block')}>
                                                                    {user.isBlocked ? (
                                                                        <LockOpen className="mr-2 size-5 text-slate-500" aria-hidden="true" />
                                                                    ) : (
                                                                        <Ban className="mr-2 size-5 text-slate-500" aria-hidden="true" />
                                                                    )}
                                                                    {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openAction(user, 'password')}>
                                                                    <Key className="mr-2 size-5 text-slate-500" aria-hidden="true" />
                                                                    Resetear Contraseña
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => openAction(user, 'delete')}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="mr-2 size-5" aria-hidden="true" />
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
                                <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-500">
                                        Mostrando {users.length} de {pagination.total} usuarios
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 sm:flex">
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

                    <TabsContent value="requests">
                        <Card className="mb-4">
                            <CardContent className="p-4">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                                        <Button
                                            key={s}
                                            variant={requestFilter === s ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setRequestFilter(s)}
                                            className="shrink-0"
                                        >
                                            {s === 'PENDING' ? 'Pendientes' : s === 'APPROVED' ? 'Aprobadas' : 'Rechazadas'}
                                            {' '}({requestCounts[s]})
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                {loadingRequests ? (
                                    <div className="p-8 text-center">
                                        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : requestsError ? (
                                    <div role="alert" className="p-8 text-center">
                                        <p className="text-sm font-medium text-destructive">No pudimos cargar las solicitudes.</p>
                                        <Button variant="outline" className="mt-4" onClick={() => void fetchProviderRequests()}>
                                            Reintentar
                                        </Button>
                                    </div>
                                ) : providerRequests.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <Inbox className="mb-2 size-10" aria-hidden="true" />
                                        <p>No hay solicitudes {requestFilter === 'PENDING' ? 'pendientes' : requestFilter === 'APPROVED' ? 'aprobadas' : 'rechazadas'}</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="text-left p-4 font-medium text-slate-600">Solicitante</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Negocio</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Motivo</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Fecha</th>
                                                    <th className="text-right p-4 font-medium text-slate-600">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {providerRequests.map((req) => (
                                                    <tr key={req.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-10 w-10">
                                                                    {req.user.image ? (
                                                                        <AvatarImage src={req.user.image} />
                                                                    ) : (
                                                                        <AvatarFallback>{req.user.name?.[0] || 'U'}</AvatarFallback>
                                                                    )}
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium text-slate-800">{req.user.name || 'Sin nombre'}</p>
                                                                    <p className="text-sm text-slate-500">{req.user.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-medium text-slate-800">{req.businessName}</p>
                                                            <p className="text-sm text-slate-500">{req.location}</p>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="text-sm text-slate-600 max-w-[200px] truncate">{req.reason}</p>
                                                        </td>
                                                        <td className="p-4 text-sm text-slate-500">
                                                            {new Date(req.createdAt).toLocaleDateString('es-AR')}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {req.status === 'PENDING' ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedRequest(req);
                                                                        setAdminNote('');
                                                                        setReviewDialogOpen(true);
                                                                    }}
                                                                >
                                                                    Revisar
                                                                </Button>
                                                            ) : (
                                                                <Badge className={req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                                    {req.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                                                                </Badge>
                                                            )}
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

                    <TabsContent value="stats">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <Users className="mb-2 size-10 text-slate-400" aria-hidden="true" />
                                    <p className="text-3xl font-bold text-slate-800">
                                        {userStats ? userStats.totalUsers.toLocaleString('es-AR') : '—'}
                                    </p>
                                    <p className="text-slate-500">Usuarios totales</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <Store className="mb-2 size-10 text-teal-400" aria-hidden="true" />
                                    <p className="text-3xl font-bold text-slate-800">
                                        {userStats ? userStats.byRole.PROVIDER.toLocaleString('es-AR') : '—'}
                                    </p>
                                    <p className="text-slate-500">Proveedores</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <ShieldUser className="mb-2 size-10 text-teal-500" aria-hidden="true" />
                                    <p className="text-3xl font-bold text-slate-800">
                                        {userStats ? userStats.byRole.ADMIN.toLocaleString('es-AR') : '—'}
                                    </p>
                                    <p className="text-slate-500">Administradores</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="providers">
                        <Card>
                            <CardHeader className="gap-3">
                                <CardTitle className="text-lg">Proveedores registrados</CardTitle>
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                    <Input
                                        value={providerSearch}
                                        onChange={(e) => setProviderSearch(e.target.value)}
                                        placeholder="Buscar por negocio, zona o email..."
                                        aria-label="Buscar proveedores"
                                        className="pl-9"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingProviders ? (
                                    <div className="p-8 text-center">
                                        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : providersError ? (
                                    <div role="alert" className="p-8 text-center">
                                        <p className="text-sm font-medium text-destructive">No pudimos cargar los proveedores.</p>
                                        <Button variant="outline" className="mt-4" onClick={() => void fetchProviders()}>
                                            Reintentar
                                        </Button>
                                    </div>
                                ) : providers.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <Store className="mb-2 size-10" aria-hidden="true" />
                                        <p>
                                            {debouncedProviderSearch
                                                ? `No encontramos proveedores para "${debouncedProviderSearch}"`
                                                : 'No hay proveedores registrados'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="text-left p-4 font-medium text-slate-600">Negocio</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Ubicación</th>
                                                    <th className="text-left p-4 font-medium text-slate-600">Calificación</th>
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
                                                                <Star className="size-3.5 text-amber-400" aria-hidden="true" fill="currentColor" />
                                                                <span className="font-medium">
                                                                    {provider.reviewCount
                                                                        ? provider.rating.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                                                        : 'Sin datos'}
                                                                </span>
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
                                                                onClick={() => setProviderToDelete(provider)}
                                                                aria-label={`Eliminar proveedor ${provider.businessName}`}
                                                            >
                                                                <Trash2 className="size-5" aria-hidden="true" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {!providersError && providerPagination.total > 0 && (
                                    <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-slate-500">
                                            Página {providerPagination.page} de {Math.max(providerPagination.totalPages, 1)} · {providerPagination.total.toLocaleString('es-AR')} proveedores
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 sm:flex">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={loadingProviders || providerPagination.page <= 1}
                                                onClick={() => setProviderPagination(p => ({ ...p, page: p.page - 1 }))}
                                            >
                                                Anterior
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={loadingProviders || providerPagination.page >= providerPagination.totalPages}
                                                onClick={() => setProviderPagination(p => ({ ...p, page: p.page + 1 }))}
                                            >
                                                Siguiente
                                            </Button>
                                        </div>
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
                            {actionType === 'role' && 'Cambiar rol'}
                            {actionType === 'block' && (selectedUser?.isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario')}
                            {actionType === 'password' && 'Restablecer contraseña'}
                            {actionType === 'delete' && 'Eliminar usuario'}
                        </DialogTitle>
                        <DialogDescription>
                            Revisá el alcance de la acción antes de confirmarla.
                        </DialogDescription>
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
                                            Compartí esta contraseña con la persona usuaria. Deberá cambiarla al iniciar sesión.
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
                                    <span className="font-semibold">Acción irreversible.</span> Se eliminarán todos los datos asociados a este usuario.
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
                                variant={actionType === 'delete' ? 'destructive' : 'default'}
                            >
                                {processing ? 'Procesando...' : 'Confirmar'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={providerToDelete !== null}
                onOpenChange={(open) => !open && setProviderToDelete(null)}
                title={`¿Eliminar a ${providerToDelete?.businessName ?? 'este proveedor'}?`}
                description={
                    <span className="block rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                        <span className="font-semibold">Acción irreversible.</span> Se eliminan su perfil de proveedor y sus servicios. Si tiene historial de turnos, no se va a poder eliminar.
                    </span>
                }
                confirmLabel="Eliminar proveedor"
                destructive
                onConfirm={async () => (providerToDelete ? deleteProvider(providerToDelete) : true)}
            />

            {/* Review Provider Request Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revisar solicitud de proveedor</DialogTitle>
                        <DialogDescription>
                            Validá la información del negocio antes de aprobar o rechazar el acceso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <p className="text-sm text-slate-500">Solicitante</p>
                            <p className="font-medium">{selectedRequest?.user.name || selectedRequest?.user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Negocio</p>
                            <p className="font-medium">{selectedRequest?.businessName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ubicación</p>
                            <p>{selectedRequest?.location}</p>
                        </div>
                        {selectedRequest?.description && (
                            <div>
                                <p className="text-sm text-slate-500">Descripción</p>
                                <p>{selectedRequest.description}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-slate-500">Motivo</p>
                            <p>{selectedRequest?.reason}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Nota del admin (opcional)</label>
                            <Textarea
                                placeholder="Agregar nota..."
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleReviewRequest('REJECTED')}
                            disabled={reviewProcessing}
                        >
                            Rechazar
                        </Button>
                        <Button
                            onClick={() => handleReviewRequest('APPROVED')}
                            disabled={reviewProcessing}
                        >
                            Aprobar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
