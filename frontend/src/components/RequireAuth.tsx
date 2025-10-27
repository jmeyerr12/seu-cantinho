'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLogged, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;           // <- espera carregar storage
    if (!isLogged && pathname !== '/login') {
      router.replace('/login');
    }
  }, [ready, isLogged, pathname, router]);

  if (!ready) return <div className='p-6'>Carregando…</div>; // evita flicker/redirect precoce
  if (!isLogged) return null; // já está redirecionando

  return <>{children}</>;
}
