'use client';

import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Branch = { id: string; name: string; city?: string; state?: string };
type Space  = { id: string; name: string; branch_id: string };

type AvailState = 'idle' | 'loading' | 'available' | 'unavailable' | 'error';

// Componente REAL (usa useSearchParams)
function NewReservationInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { token, user } = useAuth();

  const preBranchId = sp.get('branchId') ?? '';
  const preSpaceId  = sp.get('spaceId') ?? '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [branchId, setBranchId] = useState<string>(preBranchId);
  const [spaceId, setSpaceId] = useState<string>(preSpaceId);

  const [date, setDate] = useState<string>('');
  const [start, setStart] = useState<string>('18:00');
  const [end, setEnd] = useState<string>('23:00');
  const [notes, setNotes] = useState<string>('');

  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);

  const [availabilityState, setAvailabilityState] = useState<AvailState>('idle');
  const [availabilityMsg, setAvailabilityMsg] = useState<string>('');

  const [payMode, setPayMode] = useState<'signal' | 'full'>('signal');

  const [err, setErr] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  function timeToMinutes(t: string) {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm;
  }
  function hoursBetween(a: string, b: string): number {
    const diffMin = timeToMinutes(b) - timeToMinutes(a);
    return diffMin / 60;
  }
  function brl(n: number) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function to2(n: number) {
    return Number(n.toFixed(2));
  }

  // 0) Se veio só spaceId na URL, descobre a filial via /spaces/{id}
  useEffect(() => {
    (async () => {
      if (!preBranchId && preSpaceId) {
        try {
          const space = await apiFetch(`/spaces/${preSpaceId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (space?.branch_id) setBranchId(String(space.branch_id));
        } catch (e: any) {
          setErr(e?.message ?? 'Erro ao obter dados do espaço');
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
      } catch {
        setErr('Erro ao carregar filiais');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 2) Quando muda filial, carrega espaços
  useEffect(() => {
    setSpaces([]);
    setAvailabilityState('idle');
    setAvailabilityMsg('');
    setPricePerHour(null);

    if (!branchId) { setSpaceId(''); return; }

    (async () => {
      try {
        const data = await apiFetch(`/branches/${branchId}/spaces`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const list: Space[] = Array.isArray(data) ? data : (data?.items ?? []);
        setSpaces(list);

        if (
          preSpaceId &&
          list.some((s: Space) => String(s.id) === String(preSpaceId))
        ) {
          setSpaceId(preSpaceId);
        } else if (preSpaceId) {
          setSpaceId('');
        }
      } catch {
        setErr('Erro ao carregar espaços');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, token]);

  // 3) Sempre buscar preço/hora no detalhe /spaces/:id
  useEffect(() => {
    setPricePerHour(null);
    if (!spaceId) return;

    (async () => {
      try {
        setPriceLoading(true);
        const detail = await apiFetch(`/spaces/${spaceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const p =
          detail?.base_price_per_hour != null
            ? Number(detail.base_price_per_hour)
            : null;
        setPricePerHour(Number.isFinite(p as number) ? (p as number) : null);
      } catch {
        setPricePerHour(null);
      } finally {
        setPriceLoading(false);
      }
    })();
  }, [spaceId, token]);

  // 4) Disponibilidade automática
  useEffect(() => {
    if (!spaceId || !date || !start || !end) {
      setAvailabilityState('idle');
      setAvailabilityMsg('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setAvailabilityState('loading');
        setAvailabilityMsg('Verificando disponibilidade…');

        const q = `date=${encodeURIComponent(date)}&start=${encodeURIComponent(
          start,
        )}&end=${encodeURIComponent(end)}`;
        const res = await apiFetch(`/spaces/${spaceId}/availability?${q}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (cancelled) return;

        if (typeof res === 'string') {
          const s = res.toLowerCase();
          const ok = s.includes('dispon');
          setAvailabilityState(ok ? 'available' : 'unavailable');
          setAvailabilityMsg(ok ? 'Disponível' : 'Indisponível');
        } else if (res?.available === true) {
          setAvailabilityState('available');
          setAvailabilityMsg('Disponível');
        } else {
          setAvailabilityState('unavailable');
          setAvailabilityMsg('Indisponível');
        }
      } catch {
        if (cancelled) return;
        setAvailabilityState('error');
        setAvailabilityMsg('Erro ao verificar disponibilidade');
      }
    })();

    return () => { cancelled = true; };
  }, [spaceId, date, start, end, token]);

  const durationHours = useMemo(() => {
    if (!start || !end) return 0;
    const diff = hoursBetween(start, end);
    return diff > 0 ? diff : 0;
  }, [start, end]);

  const total = useMemo(() => {
    if (pricePerHour == null || durationHours <= 0) return 0;
    return pricePerHour * durationHours;
  }, [pricePerHour, durationHours]);

  const signalValue = useMemo(
    () => (total > 0 ? total * 0.3 : 0),
    [total],
  );

  const payNowValue = useMemo(
    () => (payMode === 'signal' ? signalValue : total),
    [payMode, signalValue, total],
  );

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!branchId) return setErr('Escolha uma filial.');
    if (!spaceId)  return setErr('Escolha um espaço.');
    if (!date)     return setErr('Escolha a data.');
    if (durationHours <= 0) return setErr('Horário inválido: fim deve ser após o início.');
    if (priceLoading) return setErr('Carregando preço do espaço…');
    if (pricePerHour == null) return setErr('Espaço sem preço por hora cadastrado.');
    if (availabilityState !== 'available') return setErr('O espaço não está disponível no horário selecionado.');
    if (total <= 0) return setErr('Total calculado inválido.');

    try {
      setSubmitting(true);

      const resv = await apiFetch('/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branch_id: branchId,
          space_id: spaceId,
          customer_id: user?.id,
          date,
          start_time: start,
          end_time: end,
          notes,
        }),
      });

      const reservationId = String(resv?.id ?? '');
      if (!reservationId) {
        setErr('Reserva não retornou ID.');
        return;
      }

      const purpose = payMode === 'signal' ? 'SIGNAL' : 'FULL';
      const payment = await apiFetch(`/reservations/${reservationId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: to2(payNowValue),
          method: 'PIX',
          purpose,
        }),
      });

      const paymentId = String(payment?.id ?? '');
      if (paymentId) {
        router.push(`/checkout/${paymentId}`);
      } else {
        router.push('/reservations');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar reserva/pagamento');
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled =
    submitting ||
    !branchId ||
    !spaceId ||
    !date ||
    durationHours <= 0 ||
    priceLoading ||
    pricePerHour == null ||
    availabilityState !== 'available';

  return (
    <RequireAuth>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Nova Reserva</h1>

        {err && (
          <div className="mb-4 rounded bg-red-100 text-red-700 p-2 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={createReservation} className="space-y-4">
          {/* Filial */}
          <div>
            <label className="block text-sm font-medium mb-1">Filial</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="">Selecione…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.city ? ` — ${b.city}` : ''}
                  {b.state ? `/${b.state}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Espaço */}
          <div>
            <label className="block text-sm font-medium mb-1">Espaço</label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="">Selecione…</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          {/* Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Início</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fim</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>

          {/* Disponibilidade */}
          <div className="text-sm">
            {availabilityState === 'loading' && (
              <span className="text-blue-600">{availabilityMsg}</span>
            )}
            {availabilityState === 'available' && (
              <span className="text-green-600 font-semibold">
                {availabilityMsg}
              </span>
            )}
            {availabilityState === 'unavailable' && (
              <span className="text-red-600 font-semibold">
                {availabilityMsg}
              </span>
            )}
            {availabilityState === 'error' && (
              <span className="text-red-600">{availabilityMsg}</span>
            )}
          </div>

          {/* Preço e duração */}
          <div className="text-sm border rounded px-3 py-2">
            {pricePerHour != null && durationHours > 0 ? (
              <>
                <p>
                  Preço por hora:{' '}
                  <strong>{brl(pricePerHour)}</strong>
                </p>
                <p>
                  Duração:{' '}
                  <strong>{durationHours}h</strong>
                </p>
                <p>
                  Total da reserva:{' '}
                  <strong>{brl(total)}</strong>
                </p>
              </>
            ) : (
              <p className="text-gray-500">
                Selecione filial, espaço e horários para calcular o valor.
              </p>
            )}
          </div>

          {/* Modo de pagamento */}
          <div className="space-y-1">
            <label className="block text-sm font-medium mb-1">
              Forma de pagamento agora
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={payMode === 'signal'}
                onChange={() => setPayMode('signal')}
              />
              <span>
                Entrada (30%):{' '}
                <strong>{brl(signalValue)}</strong>
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={payMode === 'full'}
                onChange={() => setPayMode('full')}
              />
              <span>
                Pagar tudo agora:{' '}
                <strong>{brl(total)}</strong>
              </span>
            </label>

            <p className="text-xs text-gray-500 mt-1">
              Você pagará agora:{' '}
              <strong>{brl(payNowValue)}</strong>
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border rounded px-2 py-1 w-full"
              rows={3}
              placeholder="Alguma informação adicional para a reserva..."
            />
          </div>

          {/* Botão */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitDisabled}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Criando reserva...' : 'Criar reserva'}
            </button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}

// Componente exportado: envolve em Suspense
export default function NewReservationPage() {
  return (
    <Suspense fallback={<div>Carregando…</div>}>
      <NewReservationInner />
    </Suspense>
  );
}
