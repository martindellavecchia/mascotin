'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    CalendarDays,
    Eye,
    Heart,
    Home,
    Key,
    MessageCircle,
    MessageSquare,
    Monitor,
    Moon,
    Newspaper,
    Bell,
    Palette,
    PawPrint,
    SlidersHorizontal,
    Stethoscope,
    Sun,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getPrimaryImageUrl } from '@/lib/media';

interface Settings {
    theme: string;
    matchingPaused: boolean;
    matchDistance: number;
    matchPetTypes: string[];
    matchPetSizes: string[];
    notifyMatches: boolean;
    notifyMessages: boolean;
    notifyComments: boolean;
    notifyEvents: boolean;
    notifyHealth: boolean;
    notifyFoster: boolean;
    profileVisible: boolean;
    hideResolvedLostPets: boolean;
}

interface Pet {
    id: string;
    name: string;
    petType: string;
    breed: string | null;
    images: string;
    thumbnailIndex: number;
    isActive: boolean;
}

const PET_TYPES = [
    { value: 'dog', label: 'Perros' },
    { value: 'cat', label: 'Gatos' },
    { value: 'bird', label: 'Aves' },
    { value: 'other', label: 'Otros' },
];

const PET_SIZES = [
    { value: 'small', label: 'Pequeño' },
    { value: 'medium', label: 'Mediano' },
    { value: 'large', label: 'Grande' },
    { value: 'xlarge', label: 'Muy grande' },
];

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { setTheme } = useTheme();

    const [settings, setSettings] = useState<Settings | null>(null);
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Delete account
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchData();
        }
    }, [status, router]);

    const fetchData = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [settingsRes, petsRes] = await Promise.all([
                fetch('/api/settings'),
                fetch('/api/owner/pets'),
            ]);
            const [settingsData, petsData] = await Promise.all([
                settingsRes.json(),
                petsRes.json(),
            ]);

            if (settingsData.success) {
                setSettings({ ...settingsData.settings, theme: 'light' });
                setTheme('light');
            } else {
                setLoadError('No pudimos cargar tu configuración. Intentá de nuevo.');
            }
            if (petsData.success) {
                setPets(petsData.pets);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setLoadError('No pudimos cargar tu configuración. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = useCallback(async (patch: Partial<Settings>) => {
        if (!settings) return;
        const prev = { ...settings };
        setSettings({ ...settings, ...patch });

        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            const data = await res.json();
            if (!data.success) {
                setSettings(prev);
                toast.error(data.error || 'Error al guardar');
            }
        } catch {
            setSettings(prev);
            toast.error('Error al guardar');
        }
    }, [settings]);

    const togglePetActive = async (petId: string, isActive: boolean) => {
        const prev = [...pets];
        setPets(pets.map(p => p.id === petId ? { ...p, isActive } : p));

        try {
            const res = await fetch(`/api/pet/${petId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive }),
            });
            const data = await res.json();
            if (!data.success) {
                setPets(prev);
                toast.error('Error al actualizar mascota');
            }
        } catch {
            setPets(prev);
            toast.error('Error al actualizar mascota');
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }
        setChangingPassword(true);
        try {
            const res = await fetch('/api/settings/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Contraseña actualizada');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(data.error);
            }
        } catch {
            toast.error('Error al cambiar contraseña');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const res = await fetch('/api/settings/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Cuenta eliminada');
                signOut({ callbackUrl: '/login' });
            } else {
                toast.error(data.error);
            }
        } catch {
            toast.error('Error al eliminar cuenta');
        } finally {
            setDeleting(false);
        }
    };

    const handleThemeChange = (theme: string) => {
        if (theme !== 'light') return;
        setTheme(theme);
        updateSetting({ theme });
    };

    const toggleArrayItem = (arr: string[], item: string) => {
        return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    };

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto flex max-w-3xl justify-center px-4 py-8">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                    <PageHeader title="Configuración" description="Personalizá tu experiencia en Huella." />
                    <EmptyState
                        className="mt-6"
                        title="La configuración no está disponible"
                        description={loadError || 'Volvé a intentarlo en unos instantes.'}
                        action={<Button variant="outline" onClick={() => void fetchData()}>Volver a intentar</Button>}
                    />
                </div>
            </div>
        );
    }

    const getPetImage = (pet: Pet) => getPrimaryImageUrl(pet.images, pet.thumbnailIndex);

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto min-w-0 max-w-3xl px-4 py-8 sm:px-6">
                <PageHeader title="Configuración" description="Personalizá tu experiencia en Huella." />

                <Tabs defaultValue="cuenta" className="mt-6 min-w-0 w-full">
                    <div className="-mx-4 mb-4 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                        <TabsList className="h-auto min-h-11 w-max min-w-full flex-nowrap justify-start">
                            <TabsTrigger className="min-h-11 min-w-28 flex-none sm:min-w-0 sm:flex-1" value="cuenta">Cuenta</TabsTrigger>
                            <TabsTrigger className="min-h-11 min-w-28 flex-none sm:min-w-0 sm:flex-1" value="mascotas">Mascotas</TabsTrigger>
                            <TabsTrigger className="min-h-11 min-w-28 flex-none sm:min-w-0 sm:flex-1" value="notificaciones">Notificaciones</TabsTrigger>
                            <TabsTrigger className="min-h-11 min-w-28 flex-none sm:min-w-0 sm:flex-1" value="feed">Feed</TabsTrigger>
                            <TabsTrigger className="min-h-11 min-w-28 flex-none sm:min-w-0 sm:flex-1" value="apariencia">Apariencia</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* CUENTA */}
                    <TabsContent value="cuenta" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Eye className="size-5 text-slate-400" aria-hidden="true" />
                                    Visibilidad del perfil
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex min-w-0 items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-700">Perfil visible</p>
                                        <p className="text-sm text-slate-500">Otros usuarios pueden encontrar tu perfil y mascotas</p>
                                    </div>
                                    <Switch
                                        aria-label="Hacer visible mi perfil"
                                        checked={settings.profileVisible}
                                        onCheckedChange={(v) => updateSetting({ profileVisible: v })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Key className="size-5 text-slate-400" aria-hidden="true" />
                                    Cambiar contraseña
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input
                                    className="min-h-11"
                                    type="password"
                                    placeholder="Contraseña actual"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                                <Input
                                    className="min-h-11"
                                    type="password"
                                    placeholder="Nueva contraseña"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Input
                                    className="min-h-11"
                                    type="password"
                                    placeholder="Confirmar nueva contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <Button
                                    className="min-h-11"
                                    onClick={handleChangePassword}
                                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                                >
                                    {changingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                                    <TriangleAlert className="size-5" aria-hidden="true" />
                                    Eliminar cuenta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-4">
                                    Esta acción es irreversible. Se eliminarán todos tus datos, mascotas, publicaciones y matches.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="min-h-11" variant="destructive">Eliminar mi cuenta</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ingresá tu contraseña para confirmar la eliminación de tu cuenta.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <Input
                                            type="password"
                                            placeholder="Tu contraseña"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                        />
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeleteAccount}
                                                disabled={deleting || !deletePassword}
                                                className="bg-red-500 hover:bg-red-600"
                                            >
                                                {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MASCOTAS */}
                    <TabsContent value="mascotas" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <PawPrint className="size-5 text-slate-400" aria-hidden="true" />
                                    Mascotas activas para matching
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pets.length === 0 ? (
                                    <p className="text-sm text-slate-400">Todavía no tenés mascotas registradas</p>
                                ) : (
                                    <div className="space-y-3">
                                        {pets.map(pet => {
                                            const img = getPetImage(pet);
                                            return (
                                                <div key={pet.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {img ? (
                                                            <img src={img} alt={pet.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100">
                                                                <PawPrint className="size-5 text-teal-600" aria-hidden="true" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-slate-800">{pet.name}</p>
                                                            <p className="truncate text-xs text-slate-500">{pet.breed || pet.petType}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <Badge className={pet.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                                                            {pet.isActive ? 'Activa' : 'Pausada'}
                                                        </Badge>
                                                        <Switch
                                                            aria-label={`${pet.isActive ? 'Pausar' : 'Activar'} perfil de ${pet.name}`}
                                                            checked={pet.isActive}
                                                            onCheckedChange={(v) => togglePetActive(pet.id, v)}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <SlidersHorizontal className="size-5 text-slate-400" aria-hidden="true" />
                                    Preferencias de matching
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex min-w-0 items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-700">Pausar matching</p>
                                        <p className="text-sm text-slate-500">No aparecer en las búsquedas de otros usuarios</p>
                                    </div>
                                    <Switch
                                        aria-label="Pausar matching"
                                        checked={settings.matchingPaused}
                                        onCheckedChange={(v) => updateSetting({ matchingPaused: v })}
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-medium text-slate-700">Distancia máxima</p>
                                        <span className="text-sm font-medium text-teal-600">{settings.matchDistance} km</span>
                                    </div>
                                    <Slider
                                        value={[settings.matchDistance]}
                                        min={1}
                                        max={200}
                                        step={5}
                                        onValueCommit={(v) => updateSetting({ matchDistance: v[0] })}
                                    />
                                </div>

                                <div>
                                    <p className="font-medium text-slate-700 mb-2">Tipos de mascota preferidos</p>
                                    <div className="flex flex-wrap gap-3">
                                        {PET_TYPES.map(t => (
                                            <label key={t.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1">
                                                <Checkbox
                                                    checked={settings.matchPetTypes.includes(t.value)}
                                                    onCheckedChange={() => updateSetting({ matchPetTypes: toggleArrayItem(settings.matchPetTypes, t.value) })}
                                                />
                                                <span className="text-sm text-slate-700">{t.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="font-medium text-slate-700 mb-2">Tamaños preferidos</p>
                                    <div className="flex flex-wrap gap-3">
                                        {PET_SIZES.map(s => (
                                            <label key={s.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1">
                                                <Checkbox
                                                    checked={settings.matchPetSizes.includes(s.value)}
                                                    onCheckedChange={() => updateSetting({ matchPetSizes: toggleArrayItem(settings.matchPetSizes, s.value) })}
                                                />
                                                <span className="text-sm text-slate-700">{s.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* NOTIFICACIONES */}
                    <TabsContent value="notificaciones">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="size-5 text-slate-400" aria-hidden="true" />
                                    Notificaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                                    Configurá qué notificaciones querés recibir. Los cambios se aplican de inmediato.
                                </p>
                                {([
                                    { key: 'notifyMatches' as const, label: 'Nuevos encuentros', desc: 'Cuando otra mascota quiere conocer a la tuya', icon: Heart },
                                    { key: 'notifyMessages' as const, label: 'Mensajes nuevos', desc: 'Cuando recibís un mensaje directo', icon: MessageCircle },
                                    { key: 'notifyComments' as const, label: 'Comentarios', desc: 'Cuando alguien comenta en tus publicaciones', icon: MessageSquare },
                                    { key: 'notifyEvents' as const, label: 'Eventos y actividades', desc: 'Nuevos eventos cerca de tu ubicación', icon: CalendarDays },
                                    { key: 'notifyHealth' as const, label: 'Recordatorios de salud', desc: 'Vacunas, controles y turnos próximos', icon: Stethoscope },
                                    { key: 'notifyFoster' as const, label: 'Hogares de tránsito', desc: 'Solicitudes y novedades de los casos de ayuda', icon: Home },
                                ] as Array<{ key: keyof Settings; label: string; desc: string; icon: LucideIcon }>).map(item => (
                                    <div key={item.key} className="flex min-w-0 items-center justify-between gap-4 py-2">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <item.icon className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-700">{item.label}</p>
                                                <p className="text-sm text-slate-500">{item.desc}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            aria-label={item.label}
                                            checked={Boolean(settings[item.key])}
                                            onCheckedChange={(v) => updateSetting({ [item.key]: v })}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FEED */}
                    <TabsContent value="feed">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Newspaper className="size-5 text-slate-400" aria-hidden="true" />
                                    Preferencias del feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex min-w-0 items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-700">Ocultar mascotas perdidas resueltas</p>
                                        <p className="text-sm text-slate-500">No mostrar publicaciones de mascotas que ya fueron encontradas</p>
                                    </div>
                                    <Switch
                                        aria-label="Ocultar mascotas perdidas resueltas"
                                        checked={settings.hideResolvedLostPets}
                                        onCheckedChange={(v) => updateSetting({ hideResolvedLostPets: v })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* APARIENCIA */}
                    <TabsContent value="apariencia">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Palette className="size-5 text-slate-400" aria-hidden="true" />
                                    Tema
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {([
                                        { value: 'light', label: 'Claro', icon: Sun, disabled: false },
                                        { value: 'dark', label: 'Oscuro', icon: Moon, disabled: true },
                                        { value: 'system', label: 'Sistema', icon: Monitor, disabled: true },
                                    ] as Array<{ value: string; label: string; icon: LucideIcon; disabled: boolean }>).map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => handleThemeChange(t.value)}
                                            disabled={t.disabled}
                                            className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 ${
                                                settings.theme === t.value
                                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                    : t.disabled
                                                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                                                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            <t.icon className="size-7" aria-hidden="true" />
                                            <span className="text-sm font-medium">{t.label}</span>
                                            {t.disabled && <span className="text-[11px]">Próximamente</span>}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-slate-500">
                                    Huella usa el modo claro para mantener una experiencia visual consistente.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
