// src/components/NavBar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function NavBar() {
  const { user, isLogged } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav className='flex gap-4'>
      <Link href='/' className='font-semibold'>Seu Cantinho</Link>
      <Link href='/reservations'>Minhas Reservas</Link>

      {isLogged && isAdmin && (
        <>
          <Link href='/branches/new'>Cadastrar Filial</Link>
          <Link href='/spaces/new'>Cadastrar Espaço</Link>
        </>
      )}
    </nav>
  );
}
