'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      // Supondo que o backend retorna { token, user }
      login(data.user, data.token);
      router.push('/');
    } else {
      setError('Credenciais inválidas');
    }
  }

  return (
    <main className='p-8 flex flex-col items-center'>
      <h1 className='text-2xl font-bold mb-6'>Login</h1>
      <form onSubmit={handleLogin} className='flex flex-col w-64 gap-3'>
        <input
          type='email'
          placeholder='Email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          className='border p-2 rounded'
        />
        <input
          type='password'
          placeholder='Senha'
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='border p-2 rounded'
        />
        {error && <p className='text-red-500 text-sm'>{error}</p>}
        <button type='submit' className='bg-blue-600 text-white p-2 rounded'>
          Entrar
        </button>
        <p className='text-sm mt-2'>
          Não tem conta? <a href='/register' className='text-green-700'>Registre-se</a>
        </p>
      </form>
    </main>
  );
}
