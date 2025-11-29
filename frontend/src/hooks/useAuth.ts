'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name?: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CUSTOMER' | string;
}

export function useAuth() {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // hidrata do localStorage ao montar
  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');

    if (t && u) {
      setToken(t);
      try { setUser(JSON.parse(u)); } catch {}
    }
    setReady(true);
  }, []);

  // sincroniza mudanças vindas de outras abas
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'token' || e.key === 'user') {
        const t = localStorage.getItem('token');
        const u = localStorage.getItem('user');
        setToken(t);
        setUser(u ? JSON.parse(u) : null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // sincroniza mudanças na MESMA aba
  useEffect(() => {
    function onAuthToken() {
      const t = localStorage.getItem('token');
      const u = localStorage.getItem('user');
      setToken(t);
      setUser(u ? JSON.parse(u) : null);
    }
    window.addEventListener('auth-token', onAuthToken);
    return () => window.removeEventListener('auth-token', onAuthToken);
  }, []);

  function login(u: User, t: string) {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setToken(t);

    // notifica a app imediatamente
    window.dispatchEvent(new Event('auth-token'));
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);

    window.dispatchEvent(new Event('auth-token'));

    router.push('/login');
  }

  return {
    user,
    token,
    isLogged: !!token,
    ready,
    login,
    logout,
  };
}
