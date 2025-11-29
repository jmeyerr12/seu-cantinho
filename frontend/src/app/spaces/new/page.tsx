'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Branch = { id: string; name: string; city?: string; state?: string };

// componente interno: usa useSearchParams
function NewSpaceInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const preBranchId = sp.get('branchId') ?? '';

  const { token } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>(preBranchId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [basePricePerHour, setBasePricePerHour] = useState<string>('');
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // carrega filiais
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/branches', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setBranches(Array.isArray(data) ? data : data?.items ?? []);
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao carregar filiais');
      }
    })();
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!branchId || !name) {
      setErr('Selecione a filial e informe o nome do espaço.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        branch_id: branchId,
        name: name.trim(),
        description: description.trim() || undefined,
        capacity: capacity ? Number(capacity) : undefined,
        base_price_per_hour: basePricePerHour ? Number(basePricePerHour) : undefined,
        active,
      };

      await apiFetch('/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      router.push('/');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao criar espaço');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <div className='p-6 max-w-xl'>
        <h1 className='text-2xl font-bold mb-4'>Cadastrar Espaço</h1>

        <form onSubmit={onSubmit} className='grid gap-4'>
          <label className='grid gap-1'>
            <span className='text-sm'>Filial</span>
            <select
              className='border rounded p-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-green-500'
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value=''>Selecione…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.city ? `— ${b.city}` : ''} {b.state ? `/${b.state}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className='grid gap-1'>
            <span className='text-sm'>Nome do Espaço</span>
            <input
              className='border rounded p-2'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Sala Multiuso'
            />
          </label>

          <label className='grid gap-1'>
            <span className='text-sm'>Descrição (opcional)</span>
            <textarea
              className='border rounded p-2'
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Espaço amplo para eventos.'
            />
          </label>

          <div className='grid grid-cols-2 gap-3'>
            <label className='grid gap-1'>
              <span className='text-sm'>Capacidade (opcional)</span>
              <input
                className='border rounded p-2'
                type='number'
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder='30'
              />
            </label>

            <label className='grid gap-1'>
              <span className='text-sm'>Preço base por hora (opcional)</span>
              <input
                className='border rounded p-2'
                type='number'
                step='0.01'
                min={0}
                value={basePricePerHour}
                onChange={(e) => setBasePricePerHour(e.target.value)}
                placeholder='120.50'
              />
            </label>
          </div>

          <label className='inline-flex items-center gap-2'>
            <input
              type='checkbox'
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Ativo</span>
          </label>

          {err && <p className='text-red-600'>{err}</p>}

          <div className='flex gap-3'>
            <button
              type='submit'
              disabled={submitting}
              className='bg-green-600 text-white px-4 py-2 rounded'
            >
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type='button'
              onClick={() => router.back()}
              className='border px-4 py-2 rounded'
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}

// componente exportado: coloca o suspense em volta
export default function NewSpacePage() {
  return (
    <Suspense fallback={<div>Carregando…</div>}>
      <NewSpaceInner />
    </Suspense>
  );
}
