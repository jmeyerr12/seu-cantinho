'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function NewBranchPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [state, setState] = useState('');   // UF, ex: SP
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!name || !state || !city || !address) {
      setErr('Preencha todos os campos.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: name.trim(),
        state: state.trim().toUpperCase(),
        city: city.trim(),
        address: address.trim(),
      };

      await apiFetch('/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      router.push('/'); // ajuste se você tiver /branches list
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao criar filial');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <div className="p-6 max-w-xl">
        <h1 className="text-2xl font-bold mb-4">Cadastrar Filial</h1>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm">Nome</span>
            <input
              className="border rounded p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Unidade Centro"
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1 col-span-1">
              <span className="text-sm">UF</span>
              <input
                className="border rounded p-2 uppercase"
                value={state}
                maxLength={2}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="SP"
              />
            </label>

            <label className="ms-10 grid gap-1 col-span-2">
              <span className="text-sm">Cidade</span>
              <input
                className="border rounded p-2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm">Endereço</span>
            <input
              className="border rounded p-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Principal, 123"
            />
          </label>

          {err && <p className="text-red-600">{err}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="border px-4 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}
