'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BadgePlus,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import BusinessOwnerBadge from '@/components/business/BusinessOwnerBadge';

interface HeaderUserMenuProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      headerImage?: string | null;
      isBusinessOwner?: boolean;
    };
  } | null;
  showLabel?: boolean;
}

export default function HeaderUserMenu({ session, showLabel = false }: HeaderUserMenuProps) {
  const router = useRouter();
  const userInitials =
    session?.user?.name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const displayImage = session?.user?.headerImage || session?.user?.image;
  const userRole = session?.user?.role || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={showLabel
            ? 'size-11 min-w-11 justify-center rounded-full p-0 lg:h-14 lg:w-[160px] lg:justify-start lg:gap-3 lg:rounded-xl lg:px-2 lg:py-2'
            : 'size-11 rounded-full p-0'}
          aria-label={session?.user?.name ? `Abrir menú de ${session.user.name}` : 'Abrir menú de usuario'}
        >
          <span className="relative shrink-0">
            <Avatar className="size-9 lg:size-10">
              {displayImage ? (
                <AvatarImage src={displayImage} alt={session?.user?.name || 'Avatar del usuario'} />
              ) : (
                <AvatarFallback className="bg-teal-700 text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              )}
            </Avatar>
            {session?.user?.isBusinessOwner && <BusinessOwnerBadge />}
          </span>
          {showLabel && (
            <span className="hidden min-w-0 text-left lg:block">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {session?.user?.name || 'Mi perfil'}
              </span>
              <span className="block text-xs font-normal text-teal-700">Cuenta activa</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-1rem))]">
        <div className="px-3 py-2 flex items-center gap-3">
          <span className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {displayImage ? (
                <AvatarImage src={displayImage} alt={session?.user?.name || 'Avatar del usuario'} />
              ) : (
                <AvatarFallback className="bg-teal-700 text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              )}
            </Avatar>
            {session?.user?.isBusinessOwner && <BusinessOwnerBadge />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session?.user?.name || 'Mi perfil'}</p>
            <p className="truncate text-xs text-slate-500">{session?.user?.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11" onClick={() => router.push('/profile')}>
          <UserRound className="mr-2 size-[18px] text-slate-500" aria-hidden="true" />
          Ver perfil
        </DropdownMenuItem>
        {userRole === 'PROVIDER' && (
          <DropdownMenuItem className="min-h-11" onClick={() => router.push('/provider')}>
            <Store className="mr-2 size-[18px] text-slate-500" aria-hidden="true" />
            Panel de proveedor
          </DropdownMenuItem>
        )}
        {userRole === 'OWNER' && (
          <DropdownMenuItem className="min-h-11" onClick={() => router.push('/provider')}>
            <BadgePlus className="mr-2 size-[18px] text-slate-500" aria-hidden="true" />
            Solicitar ser proveedor
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="min-h-11" onClick={() => router.push('/settings')}>
          <Settings className="mr-2 size-[18px] text-slate-500" aria-hidden="true" />
          Configuración
        </DropdownMenuItem>
        {userRole === 'ADMIN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11" onClick={() => router.push('/admin')}>
              <LayoutDashboard className="mr-2 size-[18px] text-teal-600" aria-hidden="true" />
              Panel de administración
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="min-h-11 text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 size-[18px]" aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
