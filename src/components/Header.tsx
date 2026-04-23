'use client';

import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell'),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50"
        aria-label="Notificaciones"
      >
        <span className="material-symbols-rounded">notifications</span>
      </Button>
    ),
  }
);

interface HeaderProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      headerImage?: string | null;
    };
  } | null;
}

export default function Header({ session }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const userInitials = session?.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U';

  const isActive = (path: string) => pathname === path;
  const displayImage = session?.user?.headerImage || session?.user?.image;
  const userRole = session?.user?.role || null;

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/community', label: 'Comunidad' },
    { href: '/shop', label: 'Servicios' },
    { href: '/messages', label: 'Mensajes' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center">
            <span className="material-symbols-rounded text-white text-xl filled">pets</span>
          </div>
          <span className="text-xl font-bold text-slate-800">MascoTin</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
                ? 'text-teal-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block flex-1 max-w-sm">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">search</span>
            <Input
              placeholder="Buscar servicios o amigos..."
              className="pl-10 bg-slate-100 border-0 rounded-full h-10 text-sm focus-visible:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50"
                aria-label="Abrir menú"
              >
                <span className="material-symbols-rounded">menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] max-w-sm">
              <SheetHeader>
                <SheetTitle>Navegación</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">search</span>
                  <Input
                    placeholder="Buscar..."
                    className="pl-10 bg-slate-100 border-0 rounded-full h-10 text-sm"
                  />
                </div>
                <nav className="space-y-1">
                  {navLinks.map((link) => (
                    <SheetClose key={link.href} asChild>
                      <Link
                        href={link.href}
                        className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <NotificationBell enabled={Boolean(session?.user?.id)} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10">
                  {displayImage ? (
                    <AvatarImage src={displayImage} alt={session?.user?.name || 'User'} />
                  ) : (
                    <AvatarFallback className="bg-teal-500 text-white font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {displayImage ? (
                    <AvatarImage src={displayImage} alt={session?.user?.name || 'User'} />
                  ) : (
                    <AvatarFallback className="bg-teal-500 text-white font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{session?.user?.name}</p>
                  <p className="text-xs text-slate-500">{session?.user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <span className="material-symbols-rounded mr-2 text-slate-500">person</span>
                Ver Perfil
              </DropdownMenuItem>
              {userRole === 'PROVIDER' && (
                <DropdownMenuItem onClick={() => router.push('/provider')}>
                  <span className="material-symbols-rounded mr-2 text-slate-500">storefront</span>
                  Panel de Proveedor
                </DropdownMenuItem>
              )}
              {userRole === 'OWNER' && (
                <DropdownMenuItem onClick={() => router.push('/provider')}>
                  <span className="material-symbols-rounded mr-2 text-slate-500">add_business</span>
                  Solicitar ser Proveedor
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <span className="material-symbols-rounded mr-2 text-slate-500">settings</span>
                Configuración
              </DropdownMenuItem>
              {userRole === 'ADMIN' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <span className="material-symbols-rounded mr-2 text-purple-500">admin_panel_settings</span>
                    Panel Admin
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-600 focus:text-red-600"
              >
                <span className="material-symbols-rounded mr-2">logout</span>
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
