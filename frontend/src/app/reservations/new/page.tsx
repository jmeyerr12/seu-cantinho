'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Branch = { id: string; name: string; city?: string; state?: string };
type Space  = { id: string; name: string; branch_id: string };

type AvailState = 'idle' | 'loading' | 'available' | 'unavailable' | 'error';

export default function NewReservationPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { token, user } = useAuth();

  // Pré-seleções via querystring
  const preBranchId = sp.get('branchId') ?? '';
  const preSpaceId  = sp.get('spaceId') ?? '';

  // Estado básico
  const [branches, setBranches] = useState<Branch[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [branchId, setBranchId] = useState<string>(preBranchId);
  const [spaceId, setSpaceId] = useState<string>(preSpaceId);

  const [date, setDate] = useState<string>('');
  const [start, setStart] = useState<string>('18:00'); // HH:mm
  const [end, setEnd] = useState<string>('23:00');     // HH:mm
  const [notes, setNotes] = useState<string>('');

  // Preço por hora vem do detalhe do espaço
  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);

  // Disponibilidade automática
  const [availabilityState, setAvailabilityState] = useState<AvailState>('idle');
  const [availabilityMsg, setAvailabilityMsg] = useState<string>('');

  // Pagamento obrigatório: Sinal (30%) ou Total
  const [payMode, setPayMode] = useState<'signal' | 'full'>('signal');

  // UI
  const [err, setErr] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  /* Helpers */
  function timeToMinutes(t: string) {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm;
  }
  function hoursBetween(a: string, b: string): number {
    const diffMin = timeToMinutes(b) - timeToMinutes(a);
    return diffMin / 60; // pode ser fracionado
  }
  function brl(n: number) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function to2(n: number) {
    // garante duas casas ao enviar ao backend
    return Number(n.toFixed(2));
  }

  /* 0) Se veio só spaceId na URL, descobre a filial via /spaces/{id} */
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

  /* 1) Carrega filiais */
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

  /* 2) Quando muda filial, carrega espaços (lista simples, sem preço aqui) */
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
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setSpaces(list);
        if (preSpaceId && list.some(s => String(s.id) === String(preSpaceId))) {
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

  /* 3) Sempre buscar preço/hora no detalhe /spaces/:id */
  useEffect(() => {
    setPricePerHour(null);
    if (!spaceId) return;

    (async () => {
      try {
        setPriceLoading(true);
        const detail = await apiFetch(`/spaces/${spaceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        // back retorna "base_price_per_hour": "1123.00"
        const p = detail?.base_price_per_hour != null ? Number(detail.base_price_per_hour) : null;
        setPricePerHour(Number.isFinite(p as number) ? (p as number) : null);
      } catch {
        setPricePerHour(null);
      } finally {
        setPriceLoading(false);
      }
    })();
  }, [spaceId, token]);

  /* 4) Disponibilidade automática */
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

        const q = `date=${encodeURIComponent(date)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
        const res = await apiFetch(`/spaces/${spaceId}/availability?${q}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (cancelled) return;

        if (typeof res === 'string') {
          const s = res.toLowerCase();
          const ok = s.includes('dispon');
          setAvailabilityState(ok ? 'available' : 'unavailable');
          setAvailabilityMsg(ok ? 'Disponível ✅' : 'Indisponível ❌');
        } else if (res?.available === true) {
          setAvailabilityState('available');
          setAvailabilityMsg('Disponível ✅');
        } else {
          setAvailabilityState('unavailable');
          setAvailabilityMsg('Indisponível ❌');
        }
      } catch {
        if (cancelled) return;
        setAvailabilityState('error');
        setAvailabilityMsg('Erro ao verificar disponibilidade');
      }
    })();

    return () => { cancelled = true; };
  }, [spaceId, date, start, end, token]);

  /* 5) Duração em horas (fracionada) */
  const durationHours = useMemo(() => {
    if (!start || !end) return 0;
    const diff = hoursBetween(start, end);
    return diff > 0 ? diff : 0;
  }, [start, end]);

  /* 6) Total calculado: pricePerHour * duração (fracionada) */
  const total = useMemo(() => {
    if (pricePerHour == null || durationHours <= 0) return 0;
    return pricePerHour * durationHours;
  }, [pricePerHour, durationHours]);

  const signalValue = useMemo(() => {
    return total > 0 ? total * 0.3 : 0;
  }, [total]);

  const payNowValue = useMemo(() => {
    return payMode === 'signal' ? signalValue : total;
  }, [payMode, signalValue, total]);

  /* 7) Submit */
  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    // validações
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

      // 1) cria a reserva
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

      // 2) cria pagamento obrigatório (decimal em reais)
      const purpose = payMode === 'signal' ? 'SIGNAL' : 'FULL';
      const payment = await apiFetch(`/reservations/${reservationId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: to2(payNowValue), // ex.: 336.90
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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Nova Reserva</h1>

        <form onSubmit={createReservation} className="grid gap-4 max-w-lg">
          {/* Filial */}
          <label className="grid gap-1">
            <span className="text-sm">Filial</span>
            <select
              className="border rounded p-2"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.city ? `— ${b.city}` : ''} {b.state ? `/${b.state}` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Espaço */}
          <label className="grid gap-1">
            <span className="text-sm">Espaço</span>
            <select
              className="border rounded p-2"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              disabled={!branchId || spaces.length === 0}
            >
              <option value="">{branchId ? 'Selecione…' : 'Escolha uma filial primeiro'}</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* Data/Horário */}
          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Data</span>
              <input
                type="date"
                className="border rounded p-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Início</span>
              <input
                type="time"
                className="border rounded p-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Fim</span>
              <input
                type="time"
                className="border rounded p-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          {/* Disponibilidade */}
          <div className="text-sm">
            {availabilityState === 'idle' && (
              <span className="text-gray-500">Selecione espaço, data e horário para verificar disponibilidade.</span>
            )}
            {availabilityState === 'loading' && (
              <span className="text-gray-600">Verificando disponibilidade…</span>
            )}
            {availabilityState === 'available' && (
              <span className="text-green-700">Disponível ✅</span>
            )}
            {availabilityState === 'unavailable' && (
              <span className="text-red-700">Indisponível ❌</span>
            )}
            {availabilityState === 'error' && (
              <span className="text-red-600">Erro ao verificar disponibilidade.</span>
            )}
          </div>

          {/* Resumo de preço */}
          <div className="mt-1 text-sm text-gray-700">
            {priceLoading && <span>Carregando preço do espaço…</span>}
            {!priceLoading && pricePerHour != null && durationHours > 0 && (
              <div className="space-y-1">
                <div>Preço por hora: <strong>{brl(pricePerHour)}</strong></div>
                <div>Duração: <strong>{durationHours.toFixed(2)} h</strong></div>
                <div>Total: <strong>{brl(total)}</strong></div>
                <div>Sinal (30%): <strong>{brl(signalValue)}</strong></div>
              </div>
            )}
            {!priceLoading && pricePerHour == null && (
              <span className="text-red-600">Este espaço não tem preço por hora cadastrado.</span>
            )}
          </div>

          {/* Pagamento obrigatório */}
          <div className="mt-3 border-t pt-3 space-y-2">
            <span className="text-sm font-medium">Pagamento</span>
            <fieldset className="grid gap-2" disabled={priceLoading || pricePerHour == null || total <= 0}>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={payMode === 'signal'} onChange={() => setPayMode('signal')} />
                <span>Pagar Sinal (30%) — {brl(signalValue || 0)}</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={payMode === 'full'} onChange={() => setPayMode('full')} />
                <span>Pagar Total — {brl(total || 0)}</span>
              </label>
              {(total > 0) && (
                <div className="text-xs text-gray-600">
                  Valor a enviar agora: <strong>{brl(payNowValue)}</strong>
                </div>
              )}
            </fieldset>
          </div>

          {err && <p className="text-red-600">{err}</p>}

          <div>
            <button
              disabled={submitDisabled}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Salvando…' : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </RequireAuth>
  );
}
