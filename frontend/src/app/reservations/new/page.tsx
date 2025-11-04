'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Branch = { id: string; name: string; state?: string; city?: string; address?: string };
type Space  = { id: string | number; name: string; price?: number; capacity?: number; branch_id?: string };

export default function NewReservationPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const preBranchId = sp.get('branchId') ?? undefined;
  const preSpaceId  = sp.get('spaceId') ?? undefined;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>(preBranchId ?? '');
  const [spaces, setSpaces]     = useState<Space[]>([]);
  const [spaceId, setSpaceId]   = useState<string>(preSpaceId ?? '');

  const [date, setDate]   = useState<string>('');       // YYYY-MM-DD
  const [start, setStart] = useState<string>('18:00');  // HH:mm
  const [end, setEnd]     = useState<string>('23:00');  // HH:mm
  const [notes, setNotes] = useState<string>('');

  const [availability, setAvailability] = useState<string>('');
  const [submitting, setSubmitting]     = useState(false);
  const [err, setErr] = useState('');

  const { token, user } = useAuth();

  // 0) Se veio somente spaceId na URL, descobre a filial via /spaces/{id}
  useEffect(() => {
    (async () => {
      if (!preBranchId && preSpaceId) {
        try {
          const space = await apiFetch(`/spaces/${preSpaceId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (space?.branch_id) {
            setBranchId(String(space.branch_id));
            // mantém o spaceId vindo da URL
          }
        } catch (e: any) {
          setErr(e.message ?? 'Erro ao obter dados do espaço');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSpaceId, preBranchId, token]);

  // 1) Carrega filiais
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/branches', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setBranches(Array.isArray(data) ? data : (data?.items ?? []));
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao carregar filiais');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 2) Quando a filial muda, zera espaço (se necessário) e carrega espaços da filial
  useEffect(() => {
    setSpaces([]);
    setAvailability('');
    if (!branchId) { setSpaceId(''); return; }

    (async () => {
      try {
        const data = await apiFetch(`/branches/${branchId}/spaces`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setSpaces(list);

        // Se a URL trouxe spaceId, só mantém se ele pertence a esta filial
        if (preSpaceId && list.some((s: Space) => String(s.id) === String(preSpaceId))) {
          setSpaceId(preSpaceId);
        } else if (!preSpaceId) {
          // não força seleção automática; deixa o usuário escolher
          // setSpaceId(list[0]?.id ? String(list[0].id) : '');
        } else {
          // spaceId da URL não pertence à filial → limpa
          setSpaceId('');
        }
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao carregar espaços da filial');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, token]);

  const selectedSpace = useMemo(
    () => spaces.find(s => String(s.id) === String(spaceId)),
    [spaces, spaceId]
  );

  async function checkAvailability() {
    setAvailability('');
    if (!branchId || !spaceId || !date) return;
    try {
      const res = await apiFetch(
        `/spaces/${spaceId}/availability?date=${encodeURIComponent(date)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      setAvailability(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (e: any) {
      setAvailability(`Indisponível ou erro: ${e.message}`);
    }
  }

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!branchId) { setErr('Escolha uma filial.'); return; }
    if (!spaceId || !date) { setErr('Escolha um espaço e uma data.'); return; }

    try {
      setSubmitting(true);
      const payload = { branch_id: branchId, space_id: spaceId, customer_id: user?.id, date, start_time: start, end_time: end, notes };

      await apiFetch('/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      router.push('/reservations');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao criar reserva');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <div className='p-6'>
        <h1 className='text-2xl font-bold mb-4'>Nova Reserva</h1>

        <form onSubmit={createReservation} className='grid gap-4 max-w-lg'>
          {/* Filial */}
          <label className='grid gap-1'>
            <span className='text-sm'>Filial</span>
            <select
              className='border rounded p-2'
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
            >
              <option value=''>Selecione…</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.city ? `— ${b.city}` : ''} {b.state ? `/${b.state}` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Espaço */}
          <label className='grid gap-1'>
            <span className='text-sm'>Espaço</span>
            <select
              className='border rounded p-2'
              value={spaceId}
              onChange={e => setSpaceId(e.target.value)}
              disabled={!branchId || spaces.length === 0}
            >
              <option value=''>{branchId ? 'Selecione…' : 'Escolha uma filial primeiro'}</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.capacity ? `(cap. ${s.capacity})` : ''} {s.price ? `- R$ ${s.price}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className='grid grid-cols-3 gap-3'>
            <label className='grid gap-1'>
              <span className='text-sm'>Data</span>
              <input type='date' className='border rounded p-2' value={date} onChange={e => setDate(e.target.value)} />
            </label>

            <label className='grid gap-1'>
              <span className='text-sm'>Início</span>
              <input type='time' className='border rounded p-2' value={start} onChange={e => setStart(e.target.value)} />
            </label>

            <label className='grid gap-1'>
              <span className='text-sm'>Fim</span>
              <input type='time' className='border rounded p-2' value={end} onChange={e => setEnd(e.target.value)} />
            </label>
          </div>

          <label className='grid gap-1'>
            <span className='text-sm'>Observações</span>
            <textarea className='border rounded p-2' rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={checkAvailability}
              className='px-3 py-2 border rounded'
              disabled={!branchId || !spaceId || !date}
            >
              Ver Disponibilidade
            </button>
            {availability && <span className='text-sm text-gray-600'>Resposta: {availability}</span>}
          </div>

          {err && <p className='text-red-600'>{err}</p>}

          <div>
            <button disabled={submitting} className='bg-green-600 text-white px-4 py-2 rounded'>
              {submitting ? 'Salvando…' : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}
