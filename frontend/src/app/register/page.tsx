'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name || !email || !password) return setErr('Preencha todos os campos.');
    if (password !== confirm) return setErr('As senhas não conferem.');

    try {
      setLoading(true);

      // ajuste os nomes dos campos se o backend esperar algo diferente
      // ex.: { fullName: name } ou { senha: password }
      const createRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      if (!createRes.ok) {
        let msg = 'Falha ao registrar.';
        try {
          const j = await createRes.json();
          msg = j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      // login automático após registrar
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!loginRes.ok) throw new Error('Conta criada, mas falhou o login automático.');

      const data = await loginRes.json(); // esperado: { token, user }
      login(data.user, data.token);
      router.push('/');
    } catch (e: any) {
      setErr(e?.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='p-8 max-w-md mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>Criar conta</h1>

      <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
        <input
          className='border p-2 rounded'
          placeholder='Nome'
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className='border p-2 rounded'
          placeholder='Email'
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className='border p-2 rounded'
          placeholder='Senha'
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          className='border p-2 rounded'
          placeholder='Confirmar senha'
          type='password'
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
        />

        {err && <p className='text-red-600 text-sm'>{err}</p>}

        <button
          disabled={loading}
          className='bg-green-600 text-white rounded p-2'
        >
          {loading ? 'Criando…' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}
