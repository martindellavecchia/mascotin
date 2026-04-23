'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderUserMenuProps {
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

export default function HeaderUserMenu({ session }: HeaderUserMenuProps) {
  const router = useRouter();
  const userInitials =
    session?.user?.name?.split(' ').map((name: string) => name[0]).join('') || 'U';
  const displayImage = session?.user?.headerImage || session?.user?.image;
  const userRole = session?.user?.role || null;

  return (
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
            <span className="material-symbols-rounded mr-2 text-slate-500">
              storefront
            </span>
            Panel de Proveedor
          </DropdownMenuItem>
        )}
        {userRole === 'OWNER' && (
          <DropdownMenuItem onClick={() => router.push('/provider')}>
            <span className="material-symbols-rounded mr-2 text-slate-500">
              add_business
            </span>
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
              <span className="material-symbols-rounded mr-2 text-purple-500">
                admin_panel_settings
              </span>
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
  );
}
