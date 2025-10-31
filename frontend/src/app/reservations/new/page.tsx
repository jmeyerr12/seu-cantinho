'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';

type Space = { id: number; name: string; price?: number; capacity?: number };

export default function NewReservationPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preSpaceId = sp.get('spaceId') ?? undefined;

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState<string>(preSpaceId ?? '');
  const [date, setDate] = useState<string>('');         // YYYY-MM-DD
  const [start, setStart] = useState<string>('18:00');  // HH:mm
  const [end, setEnd] = useState<string>('23:00');      // HH:mm
  const [notes, setNotes] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/spaces');
        setSpaces(Array.isArray(data) ? data : (data?.items ?? []));
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao carregar espaços');
      }
    })();
  }, []);

  const selectedSpace = useMemo(
    () => spaces.find(s => String(s.id) === String(spaceId)),
    [spaces, spaceId]
  );

  async function checkAvailability() {
    setAvailability('');
    if (!spaceId || !date) return;
    try {
      // ajuste se seu backend exigir outros parâmetros (ex.: start/end)
      const res = await apiFetch(`/spaces/${spaceId}/availability?date=${encodeURIComponent(date)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      setAvailability(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (e: any) {
      setAvailability(`Indisponível ou erro: ${e.message}`);
    }
  }

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!spaceId || !date) { setErr('Escolha um espaço e uma data.'); return; }

    try {
      setSubmitting(true);
      // Ajuste os campos abaixo conforme seu backend espera.
      // Exemplo comum: { spaceId, date, startTime, endTime, notes }
      const payload = { spaceId: Number(spaceId), date, startTime: start, endTime: end, notes };
      const r = await apiFetch('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      // se tudo ok, volte para a lista
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
          <label className='grid gap-1'>
            <span className='text-sm'>Espaço</span>
            <select className='border rounded p-2' value={spaceId} onChange={e => setSpaceId(e.target.value)}>
              <option value=''>Selecione…</option>
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
            <button type='button' onClick={checkAvailability} className='px-3 py-2 border rounded'>
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
