'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    profileVisible: boolean;
    hideResolvedLostPets: boolean;
}

interface Pet {
    id: string;
    name: string;
    petType: string;
    breed: string | null;
    images: string;
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
                setSettings(settingsData.settings);
                setTheme(settingsData.settings.theme);
            }
            if (petsData.success) {
                setPets(petsData.pets);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
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
        setTheme(theme);
        updateSetting({ theme });
    };

    const toggleArrayItem = (arr: string[], item: string) => {
        return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    };

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50">
                <Header session={session} />
                <div className="container mx-auto px-4 py-8 flex justify-center">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!settings) return null;

    const getPetImage = (pet: Pet) => {
        try {
            const images = JSON.parse(pet.images);
            return images[0] || null;
        } catch { return null; }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header session={session} />
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-rounded text-slate-500">settings</span>
                        Configuración
                    </h1>
                    <p className="text-slate-500">Personaliza tu experiencia en MascoTin</p>
                </div>

                <Tabs defaultValue="cuenta" className="w-full">
                    <TabsList className="mb-4 flex-wrap">
                        <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
                        <TabsTrigger value="mascotas">Mascotas</TabsTrigger>
                        <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
                        <TabsTrigger value="feed">Feed</TabsTrigger>
                        <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
                    </TabsList>

                    {/* CUENTA */}
                    <TabsContent value="cuenta" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <span className="material-symbols-rounded text-slate-400">visibility</span>
                                    Visibilidad del perfil
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-700">Perfil visible</p>
                                        <p className="text-sm text-slate-500">Otros usuarios pueden encontrar tu perfil y mascotas</p>
                                    </div>
                                    <Switch
                                        checked={settings.profileVisible}
                                        onCheckedChange={(v) => updateSetting({ profileVisible: v })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <span className="material-symbols-rounded text-slate-400">key</span>
                                    Cambiar contraseña
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input
                                    type="password"
                                    placeholder="Contraseña actual"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                                <Input
                                    type="password"
                                    placeholder="Nueva contraseña"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Input
                                    type="password"
                                    placeholder="Confirmar nueva contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <Button
                                    className="bg-teal-500 hover:bg-teal-600"
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
                                    <span className="material-symbols-rounded">warning</span>
                                    Eliminar cuenta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-4">
                                    Esta acción es irreversible. Se eliminarán todos tus datos, mascotas, publicaciones y matches.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Eliminar mi cuenta</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ingresa tu contraseña para confirmar la eliminación de tu cuenta.
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
                                    <span className="material-symbols-rounded text-slate-400">pets</span>
                                    Mascotas activas para matching
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pets.length === 0 ? (
                                    <p className="text-sm text-slate-400">No tienes mascotas registradas</p>
                                ) : (
                                    <div className="space-y-3">
                                        {pets.map(pet => {
                                            const img = getPetImage(pet);
                                            return (
                                                <div key={pet.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {img ? (
                                                            <img src={img} alt={pet.name} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                                                <span className="material-symbols-rounded text-teal-600">pets</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-slate-800">{pet.name}</p>
                                                            <p className="text-xs text-slate-500">{pet.breed || pet.petType}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={pet.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                                                            {pet.isActive ? 'Activa' : 'Pausada'}
                                                        </Badge>
                                                        <Switch
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
                                    <span className="material-symbols-rounded text-slate-400">tune</span>
                                    Preferencias de matching
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-700">Pausar matching</p>
                                        <p className="text-sm text-slate-500">No aparecer en las búsquedas de otros usuarios</p>
                                    </div>
                                    <Switch
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
                                            <label key={t.value} className="flex items-center gap-2 cursor-pointer">
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
                                            <label key={s.value} className="flex items-center gap-2 cursor-pointer">
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
                                    <span className="material-symbols-rounded text-slate-400">notifications</span>
                                    Notificaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                                    Configura qué notificaciones quieres recibir. Los cambios se aplican de inmediato.
                                </p>
                                {[
                                    { key: 'notifyMatches' as const, label: 'Nuevos matches', desc: 'Cuando una mascota hace match con la tuya', icon: 'favorite' },
                                    { key: 'notifyMessages' as const, label: 'Mensajes nuevos', desc: 'Cuando recibes un mensaje directo', icon: 'chat' },
                                    { key: 'notifyComments' as const, label: 'Comentarios', desc: 'Cuando alguien comenta en tus publicaciones', icon: 'comment' },
                                    { key: 'notifyEvents' as const, label: 'Eventos y actividades', desc: 'Nuevos eventos cerca de tu ubicación', icon: 'event' },
                                    { key: 'notifyHealth' as const, label: 'Recordatorios de salud', desc: 'Vacunas, controles y turnos próximos', icon: 'medical_services' },
                                ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-rounded text-slate-400">{item.icon}</span>
                                            <div>
                                                <p className="font-medium text-slate-700">{item.label}</p>
                                                <p className="text-sm text-slate-500">{item.desc}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={settings[item.key]}
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
                                    <span className="material-symbols-rounded text-slate-400">feed</span>
                                    Preferencias del feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-700">Ocultar mascotas perdidas resueltas</p>
                                        <p className="text-sm text-slate-500">No mostrar publicaciones de mascotas que ya fueron encontradas</p>
                                    </div>
                                    <Switch
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
                                    <span className="material-symbols-rounded text-slate-400">palette</span>
                                    Tema
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'light', label: 'Claro', icon: 'light_mode' },
                                        { value: 'dark', label: 'Oscuro', icon: 'dark_mode' },
                                        { value: 'system', label: 'Sistema', icon: 'desktop_windows' },
                                    ].map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => handleThemeChange(t.value)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                settings.theme === t.value
                                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                            }`}
                                        >
                                            <span className="material-symbols-rounded text-2xl">{t.icon}</span>
                                            <span className="text-sm font-medium">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
