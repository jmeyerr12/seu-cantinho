'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AuthActions() {
  const { isLogged, user, logout } = useAuth();

  if (!isLogged) {
    return (
      <div className='flex items-center gap-4'>
        <Link href='/login' className='text-blue-600'>Entrar</Link>
        <Link href='/register' className='text-green-700'>Registrar</Link>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-3'>
      <span className='text-sm text-gray-600'>{user?.name || user?.email}</span>
      <button onClick={logout} className='text-red-600'>Sair</button>
    </div>
  );
}
